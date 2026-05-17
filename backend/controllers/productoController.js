const db = require('../db');

exports.obtenerProductos = async (req, res) => {
    const [rows] = await db.query(`
        SELECT 
            p.id_producto,
            p.id_categoria,
            c.nombre AS categoria,
            p.nombre,
            p.descripcion,
            p.precio_venta,
            p.activo,
            p.fecha_creacion
        FROM producto p
        JOIN categoria_producto c ON p.id_categoria = c.id_categoria
        ORDER BY p.nombre
    `);

    res.json(rows);
};

exports.obtenerProducto = async (req, res) => {
    const { id } = req.params;

    const [rows] = await db.query(`
        SELECT 
            p.id_producto,
            p.id_categoria,
            c.nombre AS categoria,
            p.nombre,
            p.descripcion,
            p.precio_venta,
            p.activo,
            p.fecha_creacion
        FROM producto p
        JOIN categoria_producto c ON p.id_categoria = c.id_categoria
        WHERE p.id_producto = ?
    `, [id]);

    if (rows.length === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(rows[0]);
};

exports.crearProducto = async (req, res) => {
    const { id_categoria, nombre, descripcion, precio_venta } = req.body;

    if (!id_categoria || !nombre || precio_venta === undefined) {
        return res.status(400).json({
            error: 'Categoría, nombre y precio de venta son requeridos'
        });
    }

    if (isNaN(precio_venta) || Number(precio_venta) <= 0) {
        return res.status(400).json({
            error: 'El precio de venta debe ser mayor a 0'
        });
    }

    const [categoria] = await db.query(
        'SELECT id_categoria FROM categoria_producto WHERE id_categoria = ? AND activo = 1',
        [id_categoria]
    );

    if (categoria.length === 0) {
        return res.status(404).json({
            error: 'Categoría no encontrada o inactiva'
        });
    }

    const [resultado] = await db.query(
        `INSERT INTO producto 
        (id_categoria, nombre, descripcion, precio_venta, activo)
        VALUES (?, ?, ?, ?, 1)`,
        [
            id_categoria,
            nombre.trim(),
            descripcion ? descripcion.trim() : null,
            precio_venta
        ]
    );

    res.json({
        mensaje: 'Producto creado',
        id_producto: resultado.insertId
    });
};

exports.actualizarProducto = async (req, res) => {
    const { id } = req.params;
    const { id_categoria, nombre, descripcion, precio_venta, activo } = req.body;

    if (!id_categoria || !nombre || precio_venta === undefined) {
        return res.status(400).json({
            error: 'Categoría, nombre y precio de venta son requeridos'
        });
    }

    if (isNaN(precio_venta) || Number(precio_venta) <= 0) {
        return res.status(400).json({
            error: 'El precio de venta debe ser mayor a 0'
        });
    }

    const [categoria] = await db.query(
        'SELECT id_categoria FROM categoria_producto WHERE id_categoria = ? AND activo = 1',
        [id_categoria]
    );

    if (categoria.length === 0) {
        return res.status(404).json({
            error: 'Categoría no encontrada o inactiva'
        });
    }

    const [resultado] = await db.query(
        `UPDATE producto
         SET id_categoria = ?, nombre = ?, descripcion = ?, precio_venta = ?, activo = ?
         WHERE id_producto = ?`,
        [
            id_categoria,
            nombre.trim(),
            descripcion ? descripcion.trim() : null,
            precio_venta,
            activo ? 1 : 0,
            id
        ]
    );

    if (resultado.affectedRows === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ mensaje: 'Producto actualizado' });
};

exports.actualizarActivo = async (req, res) => {
    const { id } = req.params;
    const { activo } = req.body;

    if (activo === undefined) {
        return res.status(400).json({
            error: 'Debe enviar el campo activo'
        });
    }

    const [resultado] = await db.query(
        'UPDATE producto SET activo = ? WHERE id_producto = ?',
        [activo ? 1 : 0, id]
    );

    if (resultado.affectedRows === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({
        mensaje: activo ? 'Producto activado' : 'Producto desactivado'
    });
};

exports.desactivarProducto = async (req, res) => {
    const { id } = req.params;

    const [resultado] = await db.query(
        'UPDATE producto SET activo = 0 WHERE id_producto = ?',
        [id]
    );

    if (resultado.affectedRows === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ mensaje: 'Producto desactivado' });
};