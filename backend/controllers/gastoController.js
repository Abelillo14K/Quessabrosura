const db = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');

exports.obtenerGastos = asyncHandler(async (req, res) => {
    const [rows] = await db.query(`
        SELECT 
            g.id_gasto,
            g.fecha,
            g.descripcion,
            g.monto,
            g.anulada
        FROM gasto g
        WHERE g.anulada = 0
        ORDER BY g.fecha DESC, g.id_gasto DESC
    `);

    res.json(rows);
});

exports.crearGasto = asyncHandler(async (req, res) => {
    const { descripcion, monto, fecha } = req.body;

    if (!descripcion || descripcion.trim() === '') {
        return res.status(400).json({ error: 'La descripción es requerida' });
    }

    if (!monto || isNaN(monto) || Number(monto) <= 0) {
        return res.status(400).json({ error: 'El monto debe ser un número positivo' });
    }

    const [resultado] = await db.query(
        `INSERT INTO gasto (descripcion, monto, fecha, anulada)
         VALUES (?, ?, COALESCE(?, CURDATE()), 0)`,
        [descripcion.trim(), monto, fecha || null]
    );

    res.json({
        mensaje: 'Gasto registrado',
        id_gasto: resultado.insertId
    });
});

exports.anularGasto = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [gasto] = await db.query(
        'SELECT id_gasto, anulada FROM gasto WHERE id_gasto = ?',
        [id]
    );

    if (gasto.length === 0) {
        return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    if (gasto[0].anulada === 1) {
        return res.status(400).json({ error: 'El gasto ya está anulado' });
    }

    await db.query(
        'UPDATE gasto SET anulada = 1 WHERE id_gasto = ?',
        [id]
    );

    res.json({ mensaje: 'Gasto anulado' });
});

exports.obtenerGastosPorFecha = asyncHandler(async (req, res) => {
    const { fecha_inicio, fecha_fin } = req.query;

    let query = 'SELECT g.* FROM gasto g WHERE g.anulada = 0';
    let params = [];

    if (fecha_inicio && fecha_fin) {
        query += ' AND g.fecha BETWEEN ? AND ?';
        params = [fecha_inicio, fecha_fin];
    } else if (fecha_inicio) {
        query += ' AND g.fecha >= ?';
        params = [fecha_inicio];
    } else if (fecha_fin) {
        query += ' AND g.fecha <= ?';
        params = [fecha_fin];
    }

    query += ' ORDER BY g.fecha DESC, g.id_gasto DESC';

    const [rows] = await db.query(query, params);

    res.json(rows);
});

exports.obtenerTotalGastos = asyncHandler(async (req, res) => {
    const { fecha } = req.query;

    let query = 'SELECT COALESCE(SUM(monto), 0) AS total FROM gasto WHERE anulada = 0';
    let params = [];

    if (fecha) {
        query += ' AND fecha = ?';
        params = [fecha];
    }

    const [rows] = await db.query(query, params);

    res.json({ total: rows[0].total || 0 });
});

exports.obtenerResumen = asyncHandler(async (req, res) => {
    const [gastosHoy] = await db.query(
        'SELECT COALESCE(SUM(monto), 0) AS total FROM gasto WHERE fecha = CURDATE() AND anulada = 0'
    );

    const [gastosMes] = await db.query(`
        SELECT COALESCE(SUM(monto), 0) AS total
        FROM gasto
        WHERE anulada = 0
        AND YEAR(fecha) = YEAR(CURDATE())
        AND MONTH(fecha) = MONTH(CURDATE())
    `);

    res.json({
        hoy: gastosHoy[0].total || 0,
        mes: gastosMes[0].total || 0
    });
});