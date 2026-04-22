const db = require('../db');

exports.obtenerProductos = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM producto ORDER BY nombre');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.obtenerProducto = async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await db.query('SELECT * FROM producto WHERE id_producto = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.crearProducto = async (req, res) => {
    const { nombre, tipo, precio_venta, activo } = req.body;

    try {
        const [resultado] = await db.query(
            'INSERT INTO producto (nombre, tipo, precio_venta, activo) VALUES (?, ?, ?, ?)',
            [nombre, tipo, precio_venta, activo !== undefined ? activo : 1]
        );

        res.json({ mensaje: 'Producto creado', id_producto: resultado.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.actualizarProducto = async (req, res) => {
    const { id } = req.params;
    const { nombre, tipo, precio_venta, activo } = req.body;

    try {
        await db.query(
            'UPDATE producto SET nombre = ?, tipo = ?, precio_venta = ?, activo = ? WHERE id_producto = ?',
            [nombre, tipo, precio_venta, activo, id]
        );

        res.json({ mensaje: 'Producto actualizado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.eliminarProducto = async (req, res) => {
    const { id } = req.params;

    try {
        await db.query('DELETE FROM producto WHERE id_producto = ?', [id]);
        res.json({ mensaje: 'Producto eliminado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.actualizarActivo = async (req, res) => {
    const { id } = req.params;
    const { activo } = req.body;

    try {
        await db.query('UPDATE producto SET activo = ? WHERE id_producto = ?', [activo, id]);
        res.json({ mensaje: activo ? 'Producto activado' : 'Producto desactivado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};