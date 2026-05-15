const db = require('../db');
const bcrypt = require('bcryptjs');
const { asyncHandler } = require('../middleware/errorHandler');

exports.obtenerEmpleados = asyncHandler(async (req, res) => {
    const [rows] = await db.query(`
        SELECT 
            id_empleado,
            nombre,
            usuario,
            rol
        FROM empleado
        ORDER BY nombre
    `);

    res.json(rows);
});

exports.crearEmpleado = asyncHandler(async (req, res) => {
    const { nombre, usuario, password, rol } = req.body;

    if (!nombre || !usuario || !password || !rol) {
        return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const [existe] = await db.query(
        'SELECT id_empleado FROM empleado WHERE usuario = ?',
        [usuario]
    );

    if (existe.length > 0) {
        return res.status(400).json({ error: 'El usuario ya existe' });
    }

    const hash = await bcrypt.hash(password, 10);

    const [resultado] = await db.query(
        `INSERT INTO empleado (nombre, usuario, password, rol)
         VALUES (?, ?, ?, ?)`,
        [nombre.trim(), usuario.trim(), hash, rol.trim()]
    );

    res.json({
        mensaje: 'Empleado creado',
        id_empleado: resultado.insertId
    });
});

exports.actualizarEmpleado = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { nombre, usuario, password, rol } = req.body;

    if (!nombre || !usuario || !rol) {
        return res.status(400).json({
            error: 'Nombre, usuario y rol son requeridos'
        });
    }

    const [empleado] = await db.query(
        'SELECT id_empleado FROM empleado WHERE id_empleado = ?',
        [id]
    );

    if (empleado.length === 0) {
        return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    const [existe] = await db.query(
        'SELECT id_empleado FROM empleado WHERE usuario = ? AND id_empleado != ?',
        [usuario, id]
    );

    if (existe.length > 0) {
        return res.status(400).json({ error: 'El usuario ya existe' });
    }

    if (password && password.trim()) {
        const hash = await bcrypt.hash(password, 10);

        await db.query(
            `UPDATE empleado
             SET nombre = ?, usuario = ?, password = ?, rol = ?
             WHERE id_empleado = ?`,
            [nombre.trim(), usuario.trim(), hash, rol.trim(), id]
        );
    } else {
        await db.query(
            `UPDATE empleado
             SET nombre = ?, usuario = ?, rol = ?
             WHERE id_empleado = ?`,
            [nombre.trim(), usuario.trim(), rol.trim(), id]
        );
    }

    res.json({ mensaje: 'Empleado actualizado' });
});

exports.eliminarEmpleado = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [ventas] = await db.query(
        'SELECT id_venta FROM venta WHERE id_empleado = ? LIMIT 1',
        [id]
    );

    if (ventas.length > 0) {
        return res.status(400).json({
            error: 'No se puede eliminar el empleado porque tiene ventas registradas'
        });
    }

    const [result] = await db.query(
        'DELETE FROM empleado WHERE id_empleado = ?',
        [id]
    );

    if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    res.json({ mensaje: 'Empleado eliminado' });
});