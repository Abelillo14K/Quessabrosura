const db = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');

exports.obtenerInventario = asyncHandler(async (req, res) => {
    const [rows] = await db.query(`
        SELECT p.id_producto, p.nombre, p.tipo, p.precio_venta, p.activo,
               COALESCE(i.stock, 0) as stock, i.stock_minimo
        FROM producto p
        LEFT JOIN inventario i ON p.id_producto = i.id_producto
        ORDER BY p.nombre
    `);
    res.json(rows);
});

exports.crearInventario = asyncHandler(async (req, res) => {
    const { id_producto, stock, stock_minimo } = req.body;

    if (!id_producto || stock === undefined || stock_minimo === undefined) {
        return res.status(400).json({ error: 'Faltan campos requeridos: id_producto, stock, stock_minimo' });
    }

    if (isNaN(stock) || stock < 0 || isNaN(stock_minimo) || stock_minimo < 0) {
        return res.status(400).json({ error: 'Stock y stock mínimo deben ser números positivos' });
    }

    const [existe] = await db.query(
        'SELECT id_inventario FROM inventario WHERE id_producto = ?',
        [id_producto]
    );

    if (existe.length > 0) {
        await db.query(
            'UPDATE inventario SET stock = ?, stock_minimo = ? WHERE id_producto = ?',
            [stock, stock_minimo, id_producto]
        );
        res.json({ mensaje: 'Inventario actualizado' });
    } else {
        await db.query(
            'INSERT INTO inventario (id_producto, stock, stock_minimo) VALUES (?, ?, ?)',
            [id_producto, stock, stock_minimo]
        );
        res.json({ mensaje: 'Inventario creado' });
    }
});

exports.ajustarInventario = asyncHandler(async (req, res) => {
    const { id_producto } = req.params;
    const { stock, stock_minimo } = req.body;

    if (stock === undefined || stock_minimo === undefined) {
        return res.status(400).json({ error: 'Faltan campos requeridos: stock y stock_minimo' });
    }

    if (isNaN(stock) || stock < 0 || isNaN(stock_minimo) || stock_minimo < 0) {
        return res.status(400).json({ error: 'Stock y stock mínimo deben ser números positivos' });
    }

    const [result] = await db.query(
        'UPDATE inventario SET stock = ?, stock_minimo = ? WHERE id_producto = ?',
        [stock, stock_minimo, id_producto]
    );

    if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Producto no encontrado en inventario' });
    }

    res.json({ mensaje: 'Inventario actualizado' });
});

exports.eliminarInventario = asyncHandler(async (req, res) => {
    const { id_producto } = req.params;

    const [result] = await db.query('DELETE FROM inventario WHERE id_producto = ?', [id_producto]);

    if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Producto no encontrado en inventario' });
    }

    res.json({ mensaje: 'Inventario eliminado' });
});

exports.obtenerProductoInventario = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [rows] = await db.query(`
        SELECT p.id_producto, p.nombre, p.tipo, p.precio_venta, p.activo,
                COALESCE(i.stock, 0) as stock, i.stock_minimo
         FROM producto p
         LEFT JOIN inventario i ON p.id_producto = i.id_producto
         WHERE p.id_producto = ?
    `, [id]);

    if (rows.length === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(rows[0]);
});
