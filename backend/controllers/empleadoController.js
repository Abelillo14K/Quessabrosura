const db = require('../db');
const bcrypt = require('bcryptjs');
const { asyncHandler } = require('../middleware/errorHandler');

function obtenerIdEmpleado(req) {
    return req.empleado?.id ||
           req.empleado?.id_empleado ||
           req.empleado?.empleado_id ||
           req.user?.id ||
           req.user?.id_empleado ||
           null;
}

const rolesPermitidos = ['Administrador', 'Cajero', 'Inventario', 'Cocina'];

exports.obtenerEmpleados = asyncHandler(async (req, res) => {
    const [rows] = await db.query(`
        SELECT 
            id_empleado,
            nombre,
            usuario,
            rol,
            activo,
            fecha_creacion
        FROM empleado
        ORDER BY nombre
    `);

    res.json(rows);
});

exports.obtenerEmpleado = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [rows] = await db.query(`
        SELECT 
            id_empleado,
            nombre,
            usuario,
            rol,
            activo,
            fecha_creacion
        FROM empleado
        WHERE id_empleado = ?
    `, [id]);

    if (rows.length === 0) {
        return res.status(404).json({
            error: 'Empleado no encontrado'
        });
    }

    res.json(rows[0]);
});

exports.crearEmpleado = asyncHandler(async (req, res) => {
    const { nombre, usuario, password, rol } = req.body;

    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({
            error: 'El nombre es requerido'
        });
    }

    if (!usuario || usuario.trim() === '') {
        return res.status(400).json({
            error: 'El usuario es requerido'
        });
    }

    if (!password || password.trim() === '') {
        return res.status(400).json({
            error: 'La contraseña es requerida'
        });
    }

    if (!rol || !rolesPermitidos.includes(rol)) {
        return res.status(400).json({
            error: 'Rol inválido'
        });
    }

    const [existe] = await db.query(
        'SELECT id_empleado FROM empleado WHERE usuario = ?',
        [usuario.trim()]
    );

    if (existe.length > 0) {
        return res.status(400).json({
            error: 'Ya existe un empleado con ese usuario'
        });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [resultado] = await db.query(`
        INSERT INTO empleado
        (nombre, usuario, password, rol, activo)
        VALUES (?, ?, ?, ?, 1)
    `, [
        nombre.trim(),
        usuario.trim(),
        passwordHash,
        rol
    ]);

    res.json({
        mensaje: 'Empleado creado',
        id_empleado: resultado.insertId
    });
});

exports.actualizarEmpleado = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { nombre, usuario, rol, activo } = req.body;

    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({
            error: 'El nombre es requerido'
        });
    }

    if (!usuario || usuario.trim() === '') {
        return res.status(400).json({
            error: 'El usuario es requerido'
        });
    }

    if (!rol || !rolesPermitidos.includes(rol)) {
        return res.status(400).json({
            error: 'Rol inválido'
        });
    }

    const [existe] = await db.query(
        'SELECT id_empleado FROM empleado WHERE usuario = ? AND id_empleado != ?',
        [usuario.trim(), id]
    );

    if (existe.length > 0) {
        return res.status(400).json({
            error: 'Ya existe otro empleado con ese usuario'
        });
    }

    const [resultado] = await db.query(`
        UPDATE empleado
        SET nombre = ?, usuario = ?, rol = ?, activo = ?
        WHERE id_empleado = ?
    `, [
        nombre.trim(),
        usuario.trim(),
        rol,
        activo ? 1 : 0,
        id
    ]);

    if (resultado.affectedRows === 0) {
        return res.status(404).json({
            error: 'Empleado no encontrado'
        });
    }

    res.json({
        mensaje: 'Empleado actualizado'
    });
});

exports.cambiarPassword = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.trim() === '') {
        return res.status(400).json({
            error: 'La nueva contraseña es requerida'
        });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [resultado] = await db.query(
        'UPDATE empleado SET password = ? WHERE id_empleado = ?',
        [passwordHash, id]
    );

    if (resultado.affectedRows === 0) {
        return res.status(404).json({
            error: 'Empleado no encontrado'
        });
    }

    res.json({
        mensaje: 'Contraseña actualizada'
    });
});

exports.desactivarEmpleado = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const idEmpleadoSesion = obtenerIdEmpleado(req);

    if (Number(idEmpleadoSesion) === Number(id)) {
        return res.status(400).json({
            error: 'No puede desactivar su propio usuario'
        });
    }

    const [resultado] = await db.query(
        'UPDATE empleado SET activo = 0 WHERE id_empleado = ?',
        [id]
    );

    if (resultado.affectedRows === 0) {
        return res.status(404).json({
            error: 'Empleado no encontrado'
        });
    }

    res.json({
        mensaje: 'Empleado desactivado'
    });
});