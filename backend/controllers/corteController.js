const db = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');

exports.obtenerCortes = asyncHandler(async (req, res) => {
    const [rows] = await db.query(`
        SELECT c.id_corte, c.fecha, c.total_efectivo, c.total_transferencia, c.total_general
        FROM corte_caja c
        ORDER BY c.fecha DESC, c.id_corte DESC
    `);
    res.json(rows);
});

exports.crearCorte = asyncHandler(async (req, res) => {
    const { total_efectivo, total_transferencia, total_general } = req.body;

    if (total_efectivo === undefined || isNaN(total_efectivo) || total_efectivo < 0) {
        return res.status(400).json({ error: 'El total en efectivo debe ser un número válido' });
    }

    if (total_transferencia === undefined || isNaN(total_transferencia) || total_transferencia < 0) {
        return res.status(400).json({ error: 'El total en transferencia debe ser un número válido' });
    }

    if (total_general === undefined || isNaN(total_general) || total_general < 0) {
        return res.status(400).json({ error: 'El total general debe ser un número válido' });
    }

    const [existe] = await db.query(
        'SELECT id_corte FROM corte_caja WHERE fecha = CURDATE() LIMIT 1'
    );

    if (existe.length > 0) {
        return res.status(400).json({ error: 'Ya existe un corte registrado hoy. Elimine el anterior para registrar uno nuevo.' });
    }

    const [resultado] = await db.query(
        'INSERT INTO corte_caja (fecha, total_efectivo, total_transferencia, total_general) VALUES (CURDATE(), ?, ?, ?)',
        [total_efectivo, total_transferencia, total_general]
    );

    res.json({ mensaje: 'Corte registrado', id_corte: resultado.insertId });
});

exports.obtenerCorteDelDia = asyncHandler(async (req, res) => {
    const [rows] = await db.query(`
        SELECT *
        FROM corte_caja
        WHERE fecha = CURDATE()
        ORDER BY id_corte DESC LIMIT 1
    `);

    if (rows.length === 0) {
        return res.json({ mensaje: 'No hay corte registrado hoy' });
    }

    res.json(rows[0]);
});

exports.obtenerResumenDelDia = asyncHandler(async (req, res) => {
    const [ventas] = await db.query(`
        SELECT
            COALESCE(SUM(total), 0) as total_ventas,
            COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END), 0) as efectivo,
            COALESCE(SUM(CASE WHEN metodo_pago = 'transferencia' THEN total ELSE 0 END), 0) as transferencia,
            COUNT(*) as cantidad_ventas
        FROM venta WHERE fecha = CURDATE()
    `);

    const [gastos] = await db.query(
        'SELECT COALESCE(SUM(monto), 0) as total_gastos FROM gasto WHERE fecha = CURDATE()'
    );

    const [corte] = await db.query(
        'SELECT total_efectivo, total_transferencia, total_general FROM corte_caja WHERE fecha = CURDATE() ORDER BY id_corte DESC LIMIT 1'
    );

    res.json({
        ventas: ventas[0],
        gastos: gastos[0].total_gastos,
        tiene_corte: corte.length > 0,
        corte: corte.length > 0 ? corte[0] : null
    });
});

exports.anularCorte = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [corte] = await db.query(
        'SELECT id_corte FROM corte_caja WHERE id_corte = ?', [id]
    );

    if (corte.length === 0) {
        return res.status(404).json({ error: 'Corte no encontrado' });
    }

    await db.query('DELETE FROM corte_caja WHERE id_corte = ?', [id]);
    res.json({ mensaje: 'Corte eliminado' });
});
