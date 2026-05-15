const db = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');

exports.obtenerCompras = asyncHandler(async (req, res) => {
    const [rows] = await db.query(`
        SELECT 
            c.id_compra,
            c.fecha,
            c.total,
            c.anulada
        FROM compra c
        WHERE c.anulada = 0
        ORDER BY c.fecha DESC, c.id_compra DESC
    `);

    res.json(rows);
});

exports.obtenerDetalleCompra = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [compra] = await db.query(
        'SELECT id_compra FROM compra WHERE id_compra = ? AND anulada = 0',
        [id]
    );

    if (compra.length === 0) {
        return res.status(404).json({ error: 'Compra no encontrada' });
    }

    const [rows] = await db.query(`
        SELECT 
            dc.id_detalle_compra,
            dc.cantidad,
            dc.precio_compra,
            dc.subtotal,
            dc.id_producto,
            p.nombre AS producto
        FROM detalle_compra dc
        JOIN producto p ON dc.id_producto = p.id_producto
        WHERE dc.id_compra = ?
    `, [id]);

    res.json(rows);
});

exports.crearCompra = asyncHandler(async (req, res) => {
    const { productos } = req.body;

    if (!productos || !Array.isArray(productos) || productos.length === 0) {
        return res.status(400).json({ error: 'Debe incluir al menos un producto' });
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
        let total = 0;

        for (const p of productos) {
            total += Number(p.cantidad) * Number(p.precio);
        }

        const [resultado] = await conn.query(
            'INSERT INTO compra (fecha, total, anulada) VALUES (CURDATE(), ?, 0)',
            [total]
        );

        const idCompra = resultado.insertId;

        for (const p of productos) {
            const subtotal = Number(p.cantidad) * Number(p.precio);

            await conn.query(
                `INSERT INTO detalle_compra 
                (cantidad, precio_compra, subtotal, id_compra, id_producto)
                VALUES (?, ?, ?, ?, ?)`,
                [p.cantidad, p.precio, subtotal, idCompra, p.id_producto]
            );

            await conn.query(
                `INSERT INTO inventario (id_producto, stock, stock_minimo)
                 VALUES (?, ?, 5)
                 ON DUPLICATE KEY UPDATE stock = stock + VALUES(stock)`,
                [p.id_producto, p.cantidad]
            );
        }

        await conn.commit();

        res.json({
            mensaje: 'Compra registrada',
            id_compra: idCompra,
            total
        });

    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
});

exports.anularCompra = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
        const [compra] = await conn.query(
            'SELECT id_compra, anulada FROM compra WHERE id_compra = ? FOR UPDATE',
            [id]
        );

        if (compra.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Compra no encontrada' });
        }

        if (compra[0].anulada === 1) {
            await conn.rollback();
            return res.status(400).json({ error: 'La compra ya está anulada' });
        }

        const [detalles] = await conn.query(
            'SELECT id_producto, cantidad FROM detalle_compra WHERE id_compra = ?',
            [id]
        );

        for (const d of detalles) {
            const [stockRows] = await conn.query(
                'SELECT COALESCE(stock, 0) AS stock FROM inventario WHERE id_producto = ? FOR UPDATE',
                [d.id_producto]
            );

            const stockActual = stockRows.length > 0 ? Number(stockRows[0].stock) : 0;

            if (stockActual < Number(d.cantidad)) {
                throw Object.assign(
                    new Error('No se puede anular la compra porque parte del stock ya fue vendido o utilizado'),
                    { statusCode: 400 }
                );
            }
        }

        for (const d of detalles) {
            await conn.query(
                'UPDATE inventario SET stock = stock - ? WHERE id_producto = ?',
                [d.cantidad, d.id_producto]
            );
        }

        await conn.query(
            'UPDATE compra SET anulada = 1 WHERE id_compra = ?',
            [id]
        );

        await conn.commit();

        res.json({ mensaje: 'Compra anulada y stock revertido' });

    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
});