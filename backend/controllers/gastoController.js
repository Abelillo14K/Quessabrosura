const db = require('../db');

exports.obtenerGastos = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM gasto ORDER BY fecha DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.crearGasto = async (req, res) => {
    const { descripcion, monto, categoria } = req.body;

    try {
        await db.query(
            'INSERT INTO gasto (descripcion, monto, categoria, fecha) VALUES (?, ?, ?, CURDATE())',
            [descripcion, monto, categoria]
        );

        res.json({ mensaje: 'Gasto registrado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.eliminarGasto = async (req, res) => {
    const { id } = req.params;

    try {
        await db.query('DELETE FROM gasto WHERE id_gasto = ?', [id]);
        res.json({ mensaje: 'Gasto eliminado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.obtenerGastosPorFecha = async (req, res) => {
    const { fecha_inicio, fecha_fin } = req.query;

    try {
        let query = 'SELECT * FROM gasto';
        let params = [];

        if (fecha_inicio && fecha_fin) {
            query += ' WHERE fecha BETWEEN ? AND ?';
            params = [fecha_inicio, fecha_fin];
        } else if (fecha_inicio) {
            query += ' WHERE fecha >= ?';
            params = [fecha_inicio];
        } else if (fecha_fin) {
            query += ' WHERE fecha <= ?';
            params = [fecha_fin];
        }

        query += ' ORDER BY fecha DESC';

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.obtenerTotalGastos = async (req, res) => {
    const { fecha } = req.query;

    try {
        let query = 'SELECT SUM(monto) as total FROM gasto';
        let params = [];

        if (fecha) {
            query += ' WHERE fecha = ?';
            params = [fecha];
        }

        const [rows] = await db.query(query, params);
        res.json({ total: rows[0].total || 0 });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};