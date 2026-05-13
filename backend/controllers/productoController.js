const db = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');

exports.obtenerProductos = asyncHandler(async (req, res) => {
    const [rows] = await db.query('SELECT * FROM producto ORDER BY nombre');
    res.json(rows);
});

exports.obtenerProducto = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM producto WHERE id_producto = ?', [id]);

    if (rows.length === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(rows[0]);
});

exports.crearProducto = asyncHandler(async (req, res) => {
    const { nombre, tipo, precio_venta, activo } = req.body;

    if (!nombre || !tipo || precio_venta === undefined) {
        return res.status(400).json({ error: 'Nombre, tipo y precio de venta son requeridos' });
    }

    if (isNaN(precio_venta) || precio_venta < 0) {
        return res.status(400).json({ error: 'El precio debe ser un número válido' });
    }

    const [resultado] = await db.query(
        'INSERT INTO producto (nombre, tipo, precio_venta, activo) VALUES (?, ?, ?, ?)',
        [nombre, tipo, precio_venta, activo !== undefined ? activo : 1]
    );

    res.json({ mensaje: 'Producto creado', id_producto: resultado.insertId });
});

exports.actualizarProducto = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { nombre, tipo, precio_venta, activo } = req.body;

    const [result] = await db.query(
        'UPDATE producto SET nombre = ?, tipo = ?, precio_venta = ?, activo = ? WHERE id_producto = ?',
        [nombre, tipo, precio_venta, activo, id]
    );

    if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ mensaje: 'Producto actualizado' });
});

exports.eliminarProducto = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [result] = await db.query('DELETE FROM producto WHERE id_producto = ?', [id]);

    if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ mensaje: 'Producto eliminado' });
});

exports.actualizarActivo = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { activo } = req.body;

    const [result] = await db.query('UPDATE producto SET activo = ? WHERE id_producto = ?', [activo, id]);

    if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ mensaje: activo ? 'Producto activado' : 'Producto desactivado' });
});
