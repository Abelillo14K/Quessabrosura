const db = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');

function obtenerFechaHoy() {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function obtenerIdEmpleado(req) {
    return req.empleado?.id ||
           req.empleado?.id_empleado ||
           req.empleado?.empleado_id ||
           req.user?.id ||
           req.user?.id_empleado ||
           null;
}

exports.obtenerCortes = asyncHandler(async (req, res) => {
    const [rows] = await db.query(`
        SELECT 
            c.id_corte,
            DATE(c.fecha) AS fecha,
            TIME(c.fecha) AS hora,
            c.id_empleado,
            e.nombre AS empleado,
            c.total_ventas,
            c.total_gastos,
            c.total_efectivo,
            c.total_transferencia,
            c.total_tarjeta,
            c.total_general,
            c.diferencia,
            c.anulada
        FROM corte_caja c
        JOIN empleado e ON c.id_empleado = e.id_empleado
        ORDER BY c.fecha DESC
    `);

    res.json(rows);
});

exports.obtenerResumenDelDia = asyncHandler(async (req, res) => {
    const fecha = req.query.fecha || obtenerFechaHoy();

    const [ventasRows] = await db.query(`
        SELECT 
            COALESCE(SUM(total), 0) AS total_ventas,
            COUNT(id_venta) AS cantidad_ventas
        FROM venta
        WHERE DATE(fecha) = ?
        AND anulada = 0
    `, [fecha]);

    const [pagosRows] = await db.query(`
        SELECT 
            mp.nombre AS metodo,
            COALESCE(SUM(pv.monto), 0) AS total
        FROM pago_venta pv
        JOIN venta v ON pv.id_venta = v.id_venta
        JOIN metodo_pago mp ON pv.id_metodo_pago = mp.id_metodo_pago
        WHERE DATE(v.fecha) = ?
        AND v.anulada = 0
        GROUP BY mp.id_metodo_pago, mp.nombre
    `, [fecha]);

    const [gastosRows] = await db.query(`
        SELECT 
            COALESCE(SUM(monto), 0) AS total_gastos
        FROM gasto
        WHERE DATE(fecha) = ?
        AND anulada = 0
    `, [fecha]);

    const [corteRows] = await db.query(`
        SELECT 
            c.*,
            e.nombre AS empleado
        FROM corte_caja c
        JOIN empleado e ON c.id_empleado = e.id_empleado
        WHERE DATE(c.fecha) = ?
        AND c.anulada = 0
        ORDER BY c.fecha DESC
        LIMIT 1
    `, [fecha]);

    let efectivo = 0;
    let transferencia = 0;
    let tarjeta = 0;

    pagosRows.forEach(pago => {
        const metodo = String(pago.metodo || '').toLowerCase();
        const total = Number(pago.total || 0);

        if (metodo === 'efectivo') {
            efectivo += total;
        } else if (metodo === 'transferencia') {
            transferencia += total;
        } else if (metodo === 'tarjeta') {
            tarjeta += total;
        }
    });

    const totalVentas = Number(ventasRows[0].total_ventas || 0);
    const totalGastos = Number(gastosRows[0].total_gastos || 0);
    const esperadoNeto = totalVentas - totalGastos;

    res.json({
        fecha,
        total_ventas: totalVentas,
        cantidad_ventas: Number(ventasRows[0].cantidad_ventas || 0),
        total_gastos: totalGastos,
        total_efectivo: efectivo,
        total_transferencia: transferencia,
        total_tarjeta: tarjeta,
        esperado_neto: esperadoNeto,
        tiene_corte: corteRows.length > 0,
        corte: corteRows.length > 0 ? corteRows[0] : null
    });
});

exports.obtenerCorteDelDia = asyncHandler(async (req, res) => {
    const fecha = req.query.fecha || obtenerFechaHoy();

    const [rows] = await db.query(`
        SELECT 
            c.*,
            e.nombre AS empleado
        FROM corte_caja c
        JOIN empleado e ON c.id_empleado = e.id_empleado
        WHERE DATE(c.fecha) = ?
        AND c.anulada = 0
        ORDER BY c.fecha DESC
        LIMIT 1
    `, [fecha]);

    if (rows.length === 0) {
        return res.status(404).json({
            error: 'No hay corte registrado para esta fecha'
        });
    }

    res.json(rows[0]);
});

exports.crearCorte = asyncHandler(async (req, res) => {
    const {
        total_efectivo,
        total_transferencia,
        total_tarjeta
    } = req.body;

    const idEmpleado = obtenerIdEmpleado(req);

    if (!idEmpleado) {
        return res.status(400).json({
            error: 'No se pudo identificar el empleado. Cierre sesión e inicie sesión de nuevo.'
        });
    }

    const efectivoReal = Number(total_efectivo || 0);
    const transferenciaReal = Number(total_transferencia || 0);
    const tarjetaReal = Number(total_tarjeta || 0);

    if (efectivoReal < 0 || transferenciaReal < 0 || tarjetaReal < 0) {
        return res.status(400).json({
            error: 'Los valores del corte no pueden ser negativos'
        });
    }

    const fecha = obtenerFechaHoy();

    const [corteExistente] = await db.query(`
        SELECT id_corte
        FROM corte_caja
        WHERE DATE(fecha) = ?
        AND anulada = 0
        LIMIT 1
    `, [fecha]);

    if (corteExistente.length > 0) {
        return res.status(400).json({
            error: 'Ya existe un corte activo para el día de hoy'
        });
    }

    const [ventasRows] = await db.query(`
        SELECT COALESCE(SUM(total), 0) AS total_ventas
        FROM venta
        WHERE DATE(fecha) = ?
        AND anulada = 0
    `, [fecha]);

    const [gastosRows] = await db.query(`
        SELECT COALESCE(SUM(monto), 0) AS total_gastos
        FROM gasto
        WHERE DATE(fecha) = ?
        AND anulada = 0
    `, [fecha]);

    const totalVentas = Number(ventasRows[0].total_ventas || 0);
    const totalGastos = Number(gastosRows[0].total_gastos || 0);

    const totalGeneral = efectivoReal + transferenciaReal + tarjetaReal;
    const esperadoNeto = totalVentas - totalGastos;
    const diferencia = totalGeneral - esperadoNeto;

    const [resultado] = await db.query(`
        INSERT INTO corte_caja
        (
            fecha,
            id_empleado,
            total_ventas,
            total_gastos,
            total_efectivo,
            total_transferencia,
            total_tarjeta,
            total_general,
            diferencia,
            anulada
        )
        VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [
        idEmpleado,
        totalVentas,
        totalGastos,
        efectivoReal,
        transferenciaReal,
        tarjetaReal,
        totalGeneral,
        diferencia
    ]);

    res.json({
        mensaje: 'Corte registrado',
        id_corte: resultado.insertId,
        total_ventas: totalVentas,
        total_gastos: totalGastos,
        total_general: totalGeneral,
        diferencia
    });
});

exports.anularCorte = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [corte] = await db.query(
        'SELECT id_corte, anulada FROM corte_caja WHERE id_corte = ?',
        [id]
    );

    if (corte.length === 0) {
        return res.status(404).json({
            error: 'Corte no encontrado'
        });
    }

    if (corte[0].anulada == 1) {
        return res.status(400).json({
            error: 'El corte ya está anulado'
        });
    }

    await db.query(
        'UPDATE corte_caja SET anulada = 1 WHERE id_corte = ?',
        [id]
    );

    res.json({
        mensaje: 'Corte anulado'
    });
});