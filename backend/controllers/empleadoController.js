const db = require('../db');

exports.obtenerEmpleados = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM empleado');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.crearEmpleado = async (req, res) => {
    const { nombre, rol } = req.body;

    try {
        const [resultado] = await db.query(
            'INSERT INTO empleado (nombre, rol) VALUES (?, ?)',
            [nombre, rol]
        );
        res.json({ mensaje: 'Empleado creado', id_empleado: resultado.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.eliminarEmpleado = async (req, res) => {
    const { id } = req.params;

    try {
        await db.query('DELETE FROM empleado WHERE id_empleado = ?', [id]);
        res.json({ mensaje: 'Empleado eliminado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};