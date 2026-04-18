const db = require('../db');

// obtener todos
exports.obtenerEmpleados = async (req, res) => {
    const [rows] = await db.query('SELECT * FROM empleado');
    res.json(rows);
};

// crear
exports.crearEmpleado = async (req, res) => {
    const { nombre, rol } = req.body;

    await db.query(
        'INSERT INTO empleado (nombre, rol) VALUES (?, ?)',
        [nombre, rol]
    );

    res.json({ mensaje: 'Empleado creado' });
};

// eliminar
exports.eliminarEmpleado = async (req, res) => {
    const { id } = req.params;

    await db.query(
        'DELETE FROM empleado WHERE id_empleado = ?',
        [id]
    );

    res.json({ mensaje: 'Empleado eliminado' });
};