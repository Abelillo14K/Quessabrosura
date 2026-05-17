const db = require('../db');

exports.obtenerCategorias = async (req, res) => {
    const [rows] = await db.query(`
        SELECT 
            id_categoria,
            nombre,
            activo
        FROM categoria_producto
        ORDER BY nombre
    `);

    res.json(rows);
};

exports.obtenerCategoria = async (req, res) => {
    const { id } = req.params;

    const [rows] = await db.query(
        `SELECT 
            id_categoria,
            nombre,
            activo
        FROM categoria_producto
        WHERE id_categoria = ?`,
        [id]
    );

    if (rows.length === 0) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json(rows[0]);
};

exports.crearCategoria = async (req, res) => {
    const { nombre } = req.body;

    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ error: 'El nombre de la categoría es requerido' });
    }

    const [existe] = await db.query(
        'SELECT id_categoria FROM categoria_producto WHERE nombre = ?',
        [nombre.trim()]
    );

    if (existe.length > 0) {
        return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' });
    }

    const [resultado] = await db.query(
        'INSERT INTO categoria_producto (nombre, activo) VALUES (?, 1)',
        [nombre.trim()]
    );

    res.json({
        mensaje: 'Categoría creada',
        id_categoria: resultado.insertId
    });
};

exports.actualizarCategoria = async (req, res) => {
    const { id } = req.params;
    const { nombre, activo } = req.body;

    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ error: 'El nombre de la categoría es requerido' });
    }

    const [existe] = await db.query(
        'SELECT id_categoria FROM categoria_producto WHERE nombre = ? AND id_categoria != ?',
        [nombre.trim(), id]
    );

    if (existe.length > 0) {
        return res.status(400).json({ error: 'Ya existe otra categoría con ese nombre' });
    }

    const [resultado] = await db.query(
        `UPDATE categoria_producto
         SET nombre = ?, activo = ?
         WHERE id_categoria = ?`,
        [nombre.trim(), activo ? 1 : 0, id]
    );

    if (resultado.affectedRows === 0) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json({ mensaje: 'Categoría actualizada' });
};

exports.desactivarCategoria = async (req, res) => {
    const { id } = req.params;

    const [productos] = await db.query(
        'SELECT id_producto FROM producto WHERE id_categoria = ? AND activo = 1 LIMIT 1',
        [id]
    );

    if (productos.length > 0) {
        return res.status(400).json({
            error: 'No se puede desactivar la categoría porque tiene productos activos'
        });
    }

    const [resultado] = await db.query(
        'UPDATE categoria_producto SET activo = 0 WHERE id_categoria = ?',
        [id]
    );

    if (resultado.affectedRows === 0) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json({ mensaje: 'Categoría desactivada' });
};