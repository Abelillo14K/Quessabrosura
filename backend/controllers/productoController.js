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
    const { nombre, presentacion, precio_venta, precio_compra, stock, id_categoria } = req.body;

    try {
        const [resultado] = await db.query(
            'INSERT INTO producto (nombre, presentacion, precio_venta, precio_compra, stock, id_categoria) VALUES (?, ?, ?, ?, ?, ?)',
            [nombre, presentacion, precio_venta, precio_compra, stock, id_categoria]
        );

        res.json({ mensaje: 'Producto creado', id_producto: resultado.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.actualizarProducto = async (req, res) => {
    const { id } = req.params;
    const { nombre, presentacion, precio_venta, precio_compra, stock, id_categoria } = req.body;

    try {
        await db.query(
            `UPDATE producto 
            SET nombre = ?, presentacion = ?, precio_venta = ?, precio_compra = ?, stock = ?, id_categoria = ?
            WHERE id_producto = ?`,
            [nombre, presentacion, precio_venta, precio_compra, stock, id_categoria, id]
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

exports.actualizarStock = async (req, res) => {
    const { id } = req.params;
    const { cantidad } = req.body;

    try {
        await db.query(
            'UPDATE producto SET stock = stock + ? WHERE id_producto = ?',
            [cantidad, id]
        );

        res.json({ mensaje: 'Stock actualizado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};