const db = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');

exports.obtenerInventario = asyncHandler(async (req, res) => {
    const [rows] = await db.query(`
        SELECT 
            p.id_producto,
            p.nombre,
            p.tipo,
            p.precio_venta,
            p.activo,
            COALESCE(i.stock, 0) AS stock,
            COALESCE(i.stock_minimo, 0) AS stock_minimo,
            CASE
                WHEN COALESCE(i.stock, 0) = 0 THEN 'agotado'
                WHEN COALESCE(i.stock, 0) <= COALESCE(i.stock_minimo, 0) THEN 'bajo'
                ELSE 'suficiente'
            END AS estado_stock
        FROM producto p
        LEFT JOIN inventario i ON p.id_producto = i.id_producto
        ORDER BY p.nombre
    `);

    res.json(rows);
});

exports.obtenerProductoInventario = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [rows] = await db.query(`
        SELECT 
            p.id_producto,
            p.nombre,
            p.tipo,
            p.precio_venta,
            p.activo,
            COALESCE(i.stock, 0) AS stock,
            COALESCE(i.stock_minimo, 0) AS stock_minimo,
            CASE
                WHEN COALESCE(i.stock, 0) = 0 THEN 'agotado'
                WHEN COALESCE(i.stock, 0) <= COALESCE(i.stock_minimo, 0) THEN 'bajo'
                ELSE 'suficiente'
            END AS estado_stock
        FROM producto p
        LEFT JOIN inventario i ON p.id_producto = i.id_producto
        WHERE p.id_producto = ?
    `, [id]);

    if (rows.length === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(rows[0]);
});

exports.crearInventario = asyncHandler(async (req, res) => {
    const { id_producto, stock, stock_minimo } = req.body;

    if (!id_producto || stock === undefined || stock_minimo === undefined) {
        return res.status(400).json({
            error: 'Faltan campos requeridos: id_producto, stock, stock_minimo'
        });
    }

    if (isNaN(stock) || Number(stock) < 0 || isNaN(stock_minimo) || Number(stock_minimo) < 0) {
        return res.status(400).json({
            error: 'Stock y stock mínimo deben ser números positivos'
        });
    }

    const [producto] = await db.query(
        'SELECT id_producto FROM producto WHERE id_producto = ?',
        [id_producto]
    );

    if (producto.length === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    await db.query(
        `INSERT INTO inventario (id_producto, stock, stock_minimo)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE stock = VALUES(stock), stock_minimo = VALUES(stock_minimo)`,
        [id_producto, stock, stock_minimo]
    );

    res.json({ mensaje: 'Inventario guardado correctamente' });
});

exports.ajustarInventario = asyncHandler(async (req, res) => {
    const { id_producto } = req.params;
    const { stock, stock_minimo } = req.body;

    if (stock === undefined || stock_minimo === undefined) {
        return res.status(400).json({
            error: 'Faltan campos requeridos: stock y stock_minimo'
        });
    }

    if (isNaN(stock) || Number(stock) < 0 || isNaN(stock_minimo) || Number(stock_minimo) < 0) {
        return res.status(400).json({
            error: 'Stock y stock mínimo deben ser números positivos'
        });
    }

    const [producto] = await db.query(
        'SELECT id_producto FROM producto WHERE id_producto = ?',
        [id_producto]
    );

    if (producto.length === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    await db.query(
        `INSERT INTO inventario (id_producto, stock, stock_minimo)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE stock = VALUES(stock), stock_minimo = VALUES(stock_minimo)`,
        [id_producto, stock, stock_minimo]
    );

    res.json({ mensaje: 'Inventario actualizado' });
});

exports.eliminarInventario = asyncHandler(async (req, res) => {
    const { id_producto } = req.params;

    const [result] = await db.query(
        'DELETE FROM inventario WHERE id_producto = ?',
        [id_producto]
    );

    if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Producto no encontrado en inventario' });
    }

    res.json({ mensaje: 'Inventario eliminado' });
});