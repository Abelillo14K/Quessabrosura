const db = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');

exports.obtenerGastos = asyncHandler(async (req, res) => {
    const [rows] = await db.query(`
        SELECT g.id_gasto, g.fecha, g.descripcion, g.monto
        FROM gasto g
        ORDER BY g.fecha DESC, g.id_gasto DESC
    `);
    res.json(rows);
});

exports.crearGasto = asyncHandler(async (req, res) => {
    const { descripcion, monto, fecha } = req.body;

    if (!descripcion || descripcion.trim() === '') {
        return res.status(400).json({ error: 'La descripción es requerida' });
    }

    if (!monto || isNaN(monto) || monto <= 0) {
        return res.status(400).json({ error: 'El monto debe ser un número positivo' });
    }

    const [resultado] = await db.query(
        'INSERT INTO gasto (descripcion, monto, fecha) VALUES (?, ?, COALESCE(?, CURDATE()))',
        [descripcion.trim(), monto, fecha || null]
    );

    res.json({ mensaje: 'Gasto registrado', id_gasto: resultado.insertId });
});

exports.anularGasto = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [gasto] = await db.query('SELECT id_gasto FROM gasto WHERE id_gasto = ?', [id]);

    if (gasto.length === 0) {
        return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    await db.query('DELETE FROM gasto WHERE id_gasto = ?', [id]);
    res.json({ mensaje: 'Gasto anulado' });
});

exports.obtenerGastosPorFecha = asyncHandler(async (req, res) => {
    const { fecha_inicio, fecha_fin } = req.query;

    let query = 'SELECT g.* FROM gasto g';
    let params = [];

    if (fecha_inicio && fecha_fin) {
        query += ' WHERE g.fecha BETWEEN ? AND ?';
        params = [fecha_inicio, fecha_fin];
    } else if (fecha_inicio) {
        query += ' WHERE g.fecha >= ?';
        params = [fecha_inicio];
    } else if (fecha_fin) {
        query += ' WHERE g.fecha <= ?';
        params = [fecha_fin];
    }

    query += ' ORDER BY g.fecha DESC, g.id_gasto DESC';

    const [rows] = await db.query(query, params);
    res.json(rows);
});

exports.obtenerTotalGastos = asyncHandler(async (req, res) => {
    const { fecha } = req.query;

    let query = 'SELECT COALESCE(SUM(monto), 0) as total FROM gasto';
    let params = [];

    if (fecha) {
        query += ' WHERE fecha = ?';
        params = [fecha];
    }

    const [rows] = await db.query(query, params);
    res.json({ total: rows[0].total || 0 });
});

exports.obtenerResumen = asyncHandler(async (req, res) => {
    const hoy = new Date().toISOString().split('T')[0];

    const [gastosHoy] = await db.query(
        'SELECT COALESCE(SUM(monto), 0) as total FROM gasto WHERE fecha = ?',
        [hoy]
    );

    const [gastosMes] = await db.query(
        `SELECT COALESCE(SUM(monto), 0) as total FROM gasto
         WHERE YEAR(fecha) = YEAR(CURDATE()) AND MONTH(fecha) = MONTH(CURDATE())`
    );

    res.json({
        hoy: gastosHoy[0].total,
        mes: gastosMes[0].total
    });
});
