const db = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');

exports.obtenerVentas = asyncHandler(async (req, res) => {
    const [rows] = await db.query(`
        SELECT 
            v.id_venta,
            v.fecha,
            v.hora,
            v.total,
            v.metodo_pago,
            v.id_empleado,
            v.anulada,
            e.nombre AS empleado
        FROM venta v
        LEFT JOIN empleado e ON v.id_empleado = e.id_empleado
        WHERE v.anulada = 0
        ORDER BY v.fecha DESC, v.hora DESC
    `);

    res.json(rows);
});

exports.obtenerDetalleVenta = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [venta] = await db.query(
        'SELECT id_venta FROM venta WHERE id_venta = ? AND anulada = 0',
        [id]
    );

    if (venta.length === 0) {
        return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const [rows] = await db.query(`
        SELECT 
            dv.id_detalle AS id_detalle_venta,
            dv.cantidad,
            dv.precio_unitario AS precio_venta,
            dv.subtotal,
            dv.id_producto,
            p.nombre AS producto
        FROM detalle_venta dv
        JOIN producto p ON dv.id_producto = p.id_producto
        WHERE dv.id_venta = ?
    `, [id]);

    res.json(rows);
});

exports.crearVenta = asyncHandler(async (req, res) => {
    const { productos, metodo_pago, id_empleado } = req.body;

    const idEmpleado = req.empleado?.id || id_empleado;

    if (!idEmpleado) {
        return res.status(400).json({ error: 'No se pudo identificar el empleado de la venta' });
    }

    if (!productos || !Array.isArray(productos) || productos.length === 0) {
        return res.status(400).json({ error: 'Debe incluir al menos un producto' });
    }

    if (!metodo_pago) {
        return res.status(400).json({ error: 'El método de pago es requerido' });
    }

    const metodo = metodo_pago.toLowerCase();

    if (!['efectivo', 'transferencia'].includes(metodo)) {
        return res.status(400).json({
            error: 'Método de pago inválido. Use efectivo o transferencia'
        });
    }

    for (const p of productos) {
        if (!p.id_producto) {
            return res.status(400).json({ error: 'Cada producto debe tener id_producto' });
        }

        if (!p.cantidad || isNaN(p.cantidad) || Number(p.cantidad) <= 0) {
            return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
        }

        if (p.precio === undefined || isNaN(p.precio) || Number(p.precio) < 0) {
            return res.status(400).json({ error: 'El precio debe ser válido' });
        }
    }

    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
        for (const p of productos) {
            const [stockRows] = await conn.query(
                'SELECT COALESCE(stock, 0) AS stock FROM inventario WHERE id_producto = ? FOR UPDATE',
                [p.id_producto]
            );

            const disponible = stockRows.length > 0 ? Number(stockRows[0].stock) : 0;

            if (Number(p.cantidad) > disponible) {
                throw Object.assign(
                    new Error(`Stock insuficiente para "${p.nombre || 'Producto ID ' + p.id_producto}". Disponible: ${disponible}, solicitado: ${p.cantidad}`),
                    { statusCode: 400 }
                );
            }
        }

        let total = 0;

        for (const p of productos) {
            total += Number(p.cantidad) * Number(p.precio);
        }

        const [resultado] = await conn.query(
            `INSERT INTO venta (fecha, hora, total, metodo_pago, id_empleado, anulada)
             VALUES (CURDATE(), CURTIME(), ?, ?, ?, 0)`,
            [total, metodo, idEmpleado]
        );

        const idVenta = resultado.insertId;

        for (const p of productos) {
            const subtotal = Number(p.cantidad) * Number(p.precio);

            await conn.query(
                `INSERT INTO detalle_venta 
                (cantidad, precio_unitario, subtotal, id_venta, id_producto)
                VALUES (?, ?, ?, ?, ?)`,
                [p.cantidad, p.precio, subtotal, idVenta, p.id_producto]
            );

            await conn.query(
                'UPDATE inventario SET stock = stock - ? WHERE id_producto = ?',
                [p.cantidad, p.id_producto]
            );
        }

        await conn.commit();

        res.json({
            mensaje: 'Venta registrada',
            id_venta: idVenta,
            total
        });

    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
});

exports.anularVenta = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
        const [venta] = await conn.query(
            'SELECT id_venta, anulada FROM venta WHERE id_venta = ? FOR UPDATE',
            [id]
        );

        if (venta.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Venta no encontrada' });
        }

        if (venta[0].anulada === 1) {
            await conn.rollback();
            return res.status(400).json({ error: 'La venta ya está anulada' });
        }

        const [detalles] = await conn.query(
            'SELECT id_producto, cantidad FROM detalle_venta WHERE id_venta = ?',
            [id]
        );

        for (const d of detalles) {
            await conn.query(
                `INSERT INTO inventario (id_producto, stock, stock_minimo)
                 VALUES (?, ?, 5)
                 ON DUPLICATE KEY UPDATE stock = stock + VALUES(stock)`,
                [d.id_producto, d.cantidad]
            );
        }

        await conn.query(
            'UPDATE venta SET anulada = 1 WHERE id_venta = ?',
            [id]
        );

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

    let query = `
        SELECT 
            v.*,
            e.nombre AS empleado
        FROM venta v
        LEFT JOIN empleado e ON v.id_empleado = e.id_empleado
        WHERE v.anulada = 0
    `;

    let params = [];

    if (fecha_inicio && fecha_fin) {
        query += ' AND v.fecha BETWEEN ? AND ?';
        params = [fecha_inicio, fecha_fin];
    } else if (fecha_inicio) {
        query += ' AND v.fecha >= ?';
        params = [fecha_inicio];
    } else if (fecha_fin) {
        query += ' AND v.fecha <= ?';
        params = [fecha_fin];
    }

    query += ' ORDER BY v.fecha DESC, v.hora DESC';

    const [rows] = await db.query(query, params);

    res.json(rows);
});