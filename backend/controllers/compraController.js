const db = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');

exports.obtenerCompras = asyncHandler(async (req, res) => {
    const [rows] = await db.query(`
        SELECT c.id_compra, c.fecha, c.total
        FROM compra c
        ORDER BY c.fecha DESC, c.id_compra DESC
    `);
    res.json(rows);
});

exports.obtenerDetalleCompra = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [rows] = await db.query(`
        SELECT dc.id_detalle_compra, dc.cantidad, dc.precio_compra, dc.subtotal,
               dc.id_producto, p.nombre as producto
        FROM detalle_compra dc
        JOIN producto p ON dc.id_producto = p.id_producto
        WHERE dc.id_compra = ?
    `, [id]);

    if (rows.length === 0) {
        return res.status(404).json({ error: 'Compra no encontrada' });
    }

    res.json(rows);
});

exports.crearCompra = asyncHandler(async (req, res) => {
    const { productos } = req.body;

    if (!productos || !Array.isArray(productos) || productos.length === 0) {
        return res.status(400).json({ error: 'Debe incluir al menos un producto' });
    }

    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
        let total = 0;
        for (const p of productos) {
            total += p.cantidad * p.precio;
        }

        const [resultado] = await conn.query(
            'INSERT INTO compra (fecha, total) VALUES (CURDATE(), ?)',
            [total]
        );

        const id_compra = resultado.insertId;

        for (const p of productos) {
            await conn.query(
                `INSERT INTO detalle_compra (cantidad, precio_compra, subtotal, id_compra, id_producto)
                VALUES (?, ?, ?, ?, ?)`,
                [p.cantidad, p.precio, p.cantidad * p.precio, id_compra, p.id_producto]
            );

            await conn.query(
                `INSERT INTO inventario (id_producto, stock, stock_minimo)
                VALUES (?, ?, 5)
                ON DUPLICATE KEY UPDATE stock = stock + ?`,
                [p.id_producto, p.cantidad, p.cantidad]
            );
        }

        await conn.commit();
        res.json({ mensaje: 'Compra registrada', id_compra });
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
});

exports.anularCompra = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [detalles] = await db.query(
        'SELECT id_producto, cantidad FROM detalle_compra WHERE id_compra = ?',
        [id]
    );

    if (detalles.length === 0) {
        return res.status(404).json({ error: 'Compra no encontrada' });
    }

    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
        for (const d of detalles) {
            await conn.query(
                'UPDATE inventario SET stock = GREATEST(stock - ?, 0) WHERE id_producto = ?',
                [d.cantidad, d.id_producto]
            );
        }

        await conn.query('DELETE FROM compra WHERE id_compra = ?', [id]);
        await conn.query('DELETE FROM detalle_compra WHERE id_compra = ?', [id]);

        await conn.commit();
        res.json({ mensaje: 'Compra anulada y stock revertido' });
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
});
