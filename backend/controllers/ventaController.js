const db = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');

exports.obtenerVentas = asyncHandler(async (req, res) => {
    const [rows] = await db.query(`
        SELECT v.id_venta, v.fecha, v.hora, v.total, v.metodo_pago,
               e.nombre as empleado
        FROM venta v
        LEFT JOIN empleado e ON v.id_empleado = e.id_empleado
        ORDER BY v.fecha DESC, v.hora DESC
    `);
    res.json(rows);
});

exports.obtenerDetalleVenta = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [rows] = await db.query(`
        SELECT dv.id_detalle as id_detalle_venta, dv.cantidad, dv.precio_unitario as precio_venta,
               dv.subtotal, dv.id_producto, p.nombre as producto
        FROM detalle_venta dv
        JOIN producto p ON dv.id_producto = p.id_producto
        WHERE dv.id_venta = ?
    `, [id]);

    if (rows.length === 0) {
        return res.status(404).json({ error: 'Venta no encontrada' });
    }

    res.json(rows);
});

exports.crearVenta = asyncHandler(async (req, res) => {
    const { productos, metodo_pago, id_empleado } = req.body;

    if (!productos || !Array.isArray(productos) || productos.length === 0) {
        return res.status(400).json({ error: 'Debe incluir al menos un producto' });
    }

    if (!metodo_pago) {
        return res.status(400).json({ error: 'El método de pago es requerido' });
    }

    const metodo = metodo_pago.toLowerCase();
    if (!['efectivo', 'transferencia'].includes(metodo)) {
        return res.status(400).json({ error: 'Método de pago inválido. Use: Efectivo o Transferencia' });
    }

    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
        for (const p of productos) {
            const [rows] = await conn.query(
                'SELECT COALESCE(stock, 0) as stock FROM inventario WHERE id_producto = ? FOR UPDATE',
                [p.id_producto]
            );
            const disponible = rows.length > 0 ? rows[0].stock : 0;
            if (p.cantidad > disponible) {
                throw Object.assign(new Error(
                    `Stock insuficiente para "${p.nombre || 'Producto ID ' + p.id_producto}". Disponible: ${disponible}, solicitado: ${p.cantidad}`
                ), { statusCode: 400 });
            }
        }

        let total = 0;
        for (const p of productos) {
            total += p.cantidad * p.precio;
        }

        const [resultado] = await conn.query(
            'INSERT INTO venta (fecha, hora, total, metodo_pago, id_empleado) VALUES (CURDATE(), CURTIME(), ?, ?, ?)',
            [total, metodo, id_empleado]
        );

        const id_venta = resultado.insertId;

        for (const p of productos) {
            await conn.query(
                `INSERT INTO detalle_venta (cantidad, precio_unitario, subtotal, id_venta, id_producto)
                VALUES (?, ?, ?, ?, ?)`,
                [p.cantidad, p.precio, p.cantidad * p.precio, id_venta, p.id_producto]
            );

            await conn.query(
                'UPDATE inventario SET stock = stock - ? WHERE id_producto = ?',
                [p.cantidad, p.id_producto]
            );
        }

        await conn.commit();
        res.json({ mensaje: 'Venta registrada', id_venta });
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
});

exports.anularVenta = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [detalles] = await db.query(
        'SELECT id_producto, cantidad FROM detalle_venta WHERE id_venta = ?',
        [id]
    );

    if (detalles.length === 0) {
        return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
        for (const d of detalles) {
            await conn.query(
                'UPDATE inventario SET stock = stock + ? WHERE id_producto = ?',
                [d.cantidad, d.id_producto]
            );
        }

        await conn.query('DELETE FROM venta WHERE id_venta = ?', [id]);
        await conn.query('DELETE FROM detalle_venta WHERE id_venta = ?', [id]);

        await conn.commit();
        res.json({ mensaje: 'Venta anulada y stock revertido' });
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
});

exports.obtenerVentasPorFecha = asyncHandler(async (req, res) => {
    const { fecha_inicio, fecha_fin } = req.query;

    let query = 'SELECT v.*, e.nombre as empleado FROM venta v LEFT JOIN empleado e ON v.id_empleado = e.id_empleado';
    let params = [];

    if (fecha_inicio && fecha_fin) {
        query += ' WHERE v.fecha BETWEEN ? AND ?';
        params = [fecha_inicio, fecha_fin];
    } else if (fecha_inicio) {
        query += ' WHERE v.fecha >= ?';
        params = [fecha_inicio];
    } else if (fecha_fin) {
        query += ' WHERE v.fecha <= ?';
        params = [fecha_fin];
    }

    query += ' ORDER BY v.fecha DESC, v.hora DESC';

    const [rows] = await db.query(query, params);
    res.json(rows);
});
