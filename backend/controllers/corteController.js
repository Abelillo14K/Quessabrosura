const db = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');

exports.obtenerCortes = asyncHandler(async (req, res) => {
    const [rows] = await db.query(`
        SELECT 
            c.id_corte,
            c.fecha,
            c.total_efectivo,
            c.total_transferencia,
            c.total_general,
            c.anulada
        FROM corte_caja c
        WHERE c.anulada = 0
        ORDER BY c.fecha DESC, c.id_corte DESC
    `);

    res.json(rows);
});

exports.crearCorte = asyncHandler(async (req, res) => {
    const [existe] = await db.query(
        'SELECT id_corte FROM corte_caja WHERE fecha = CURDATE() AND anulada = 0 LIMIT 1'
    );

    if (existe.length > 0) {
        return res.status(400).json({
            error: 'Ya existe un corte registrado hoy. Anule el anterior para registrar uno nuevo.'
        });
    }

    const [totales] = await db.query(`
        SELECT
            COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END), 0) AS total_efectivo,
            COALESCE(SUM(CASE WHEN metodo_pago = 'transferencia' THEN total ELSE 0 END), 0) AS total_transferencia,
            COALESCE(SUM(total), 0) AS total_general
        FROM venta
        WHERE fecha = CURDATE()
        AND anulada = 0
    `);

    const totalEfectivo = totales[0].total_efectivo || 0;
    const totalTransferencia = totales[0].total_transferencia || 0;
    const totalGeneral = totales[0].total_general || 0;

    const [resultado] = await db.query(
        `INSERT INTO corte_caja 
        (fecha, total_efectivo, total_transferencia, total_general, anulada)
        VALUES (CURDATE(), ?, ?, ?, 0)`,
        [totalEfectivo, totalTransferencia, totalGeneral]
    );

    res.json({
        mensaje: 'Corte registrado',
        id_corte: resultado.insertId,
        total_efectivo: totalEfectivo,
        total_transferencia: totalTransferencia,
        total_general: totalGeneral
    });
});

exports.obtenerCorteDelDia = asyncHandler(async (req, res) => {
    const [rows] = await db.query(`
        SELECT *
        FROM corte_caja
        WHERE fecha = CURDATE()
        AND anulada = 0
        ORDER BY id_corte DESC
        LIMIT 1
    `);

    if (rows.length === 0) {
        return res.json({ mensaje: 'No hay corte registrado hoy', corte: null });
    }

    res.json(rows[0]);
});

exports.obtenerResumenDelDia = asyncHandler(async (req, res) => {
    const [ventas] = await db.query(`
        SELECT
            COALESCE(SUM(total), 0) AS total_ventas,
            COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END), 0) AS efectivo,
            COALESCE(SUM(CASE WHEN metodo_pago = 'transferencia' THEN total ELSE 0 END), 0) AS transferencia,
            COUNT(*) AS cantidad_ventas
        FROM venta
        WHERE fecha = CURDATE()
        AND anulada = 0
    `);

    const [gastos] = await db.query(`
        SELECT COALESCE(SUM(monto), 0) AS total_gastos
        FROM gasto
        WHERE fecha = CURDATE()
        AND anulada = 0
    `);

    const [corte] = await db.query(`
        SELECT 
            total_efectivo,
            total_transferencia,
            total_general
        FROM corte_caja
        WHERE fecha = CURDATE()
        AND anulada = 0
        ORDER BY id_corte DESC
        LIMIT 1
    `);

    res.json({
        ventas: ventas[0],
        gastos: gastos[0].total_gastos || 0,
        ganancia_aproximada: Number(ventas[0].total_ventas || 0) - Number(gastos[0].total_gastos || 0),
        tiene_corte: corte.length > 0,
        corte: corte.length > 0 ? corte[0] : null
    });
});

exports.anularCorte = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [corte] = await db.query(
        'SELECT id_corte, anulada FROM corte_caja WHERE id_corte = ?',
        [id]
    );

    if (corte.length === 0) {
        return res.status(404).json({ error: 'Corte no encontrado' });
    }

    if (corte[0].anulada === 1) {
        return res.status(400).json({ error: 'El corte ya está anulado' });
    }

    await db.query(
        'UPDATE corte_caja SET anulada = 1 WHERE id_corte = ?',
        [id]
    );

    res.json({ mensaje: 'Corte anulado' });
});