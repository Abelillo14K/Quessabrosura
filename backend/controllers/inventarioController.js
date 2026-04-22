const db = require('../db');

exports.obtenerInventario = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT p.id_producto, p.nombre, p.tipo, p.precio_venta, p.activo,
                   COALESCE(i.cantidad, 0) as cantidad
            FROM producto p
            LEFT JOIN inventario i ON p.id_producto = i.id_producto
            ORDER BY p.nombre
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.crearInventario = async (req, res) => {
    const { id_producto, cantidad } = req.body;

    try {
        const [existe] = await db.query(
            'SELECT id_inventario FROM inventario WHERE id_producto = ?',
            [id_producto]
        );

        if (existe.length > 0) {
            await db.query(
                'UPDATE inventario SET cantidad = ? WHERE id_producto = ?',
                [cantidad, id_producto]
            );
            res.json({ mensaje: 'Inventario actualizado' });
        } else {
            await db.query(
                'INSERT INTO inventario (id_producto, cantidad) VALUES (?, ?)',
                [id_producto, cantidad]
            );
            res.json({ mensaje: 'Inventario creado' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.ajustarInventario = async (req, res) => {
    const { id_producto } = req.params;
    const { cantidad } = req.body;

    try {
        await db.query(
            'UPDATE inventario SET cantidad = ? WHERE id_producto = ?',
            [cantidad, id_producto]
        );
        res.json({ mensaje: 'Cantidad ajustada' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.obtenerProductoInventario = async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await db.query(
            `SELECT p.id_producto, p.nombre, p.tipo, p.precio_venta, p.activo,
                    COALESCE(i.cantidad, 0) as cantidad
             FROM producto p
             LEFT JOIN inventario i ON p.id_producto = i.id_producto
             WHERE p.id_producto = ?`,
            [id]
        );
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};