const db = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');

exports.obtenerProveedores = asyncHandler(async (req, res) => {
    const [rows] = await db.query(`
        SELECT 
            id_proveedor,
            nombre,
            telefono,
            direccion,
            activo
        FROM proveedor
        ORDER BY nombre
    `);

    res.json(rows);
});

exports.obtenerProveedor = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [rows] = await db.query(`
        SELECT 
            id_proveedor,
            nombre,
            telefono,
            direccion,
            activo
        FROM proveedor
        WHERE id_proveedor = ?
    `, [id]);

    if (rows.length === 0) {
        return res.status(404).json({
            error: 'Proveedor no encontrado'
        });
    }

    res.json(rows[0]);
});

exports.crearProveedor = asyncHandler(async (req, res) => {
    const { nombre, telefono, direccion } = req.body;

    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({
            error: 'El nombre del proveedor es requerido'
        });
    }

    const [existe] = await db.query(
        'SELECT id_proveedor FROM proveedor WHERE nombre = ?',
        [nombre.trim()]
    );

    if (existe.length > 0) {
        return res.status(400).json({
            error: 'Ya existe un proveedor con ese nombre'
        });
    }

    const [resultado] = await db.query(`
        INSERT INTO proveedor
        (nombre, telefono, direccion, activo)
        VALUES (?, ?, ?, 1)
    `, [
        nombre.trim(),
        telefono ? telefono.trim() : null,
        direccion ? direccion.trim() : null
    ]);

    res.json({
        mensaje: 'Proveedor creado',
        id_proveedor: resultado.insertId
    });
});

exports.actualizarProveedor = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { nombre, telefono, direccion, activo } = req.body;

    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({
            error: 'El nombre del proveedor es requerido'
        });
    }

    const [existe] = await db.query(
        'SELECT id_proveedor FROM proveedor WHERE nombre = ? AND id_proveedor != ?',
        [nombre.trim(), id]
    );

    if (existe.length > 0) {
        return res.status(400).json({
            error: 'Ya existe otro proveedor con ese nombre'
        });
    }

    const [resultado] = await db.query(`
        UPDATE proveedor
        SET nombre = ?, telefono = ?, direccion = ?, activo = ?
        WHERE id_proveedor = ?
    `, [
        nombre.trim(),
        telefono ? telefono.trim() : null,
        direccion ? direccion.trim() : null,
        activo ? 1 : 0,
        id
    ]);

    if (resultado.affectedRows === 0) {
        return res.status(404).json({
            error: 'Proveedor no encontrado'
        });
    }

    res.json({
        mensaje: 'Proveedor actualizado'
    });
});

exports.desactivarProveedor = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [resultado] = await db.query(
        'UPDATE proveedor SET activo = 0 WHERE id_proveedor = ?',
        [id]
    );

    if (resultado.affectedRows === 0) {
        return res.status(404).json({
            error: 'Proveedor no encontrado'
        });
    }

    res.json({
        mensaje: 'Proveedor desactivado'
    });
});