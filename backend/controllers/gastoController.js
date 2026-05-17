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

exports.obtenerGastos = asyncHandler(async (req, res) => {
    const [rows] = await db.query(`
        SELECT 
            g.id_gasto,
            DATE(g.fecha) AS fecha,
            TIME(g.fecha) AS hora,
            g.descripcion,
            g.monto,
            g.id_empleado,
            e.nombre AS empleado,
            g.anulada
        FROM gasto g
        JOIN empleado e ON g.id_empleado = e.id_empleado
        ORDER BY g.fecha DESC
    `);

    res.json(rows);
});

exports.obtenerResumenGastos = asyncHandler(async (req, res) => {
    const hoy = obtenerFechaHoy();

    const [hoyRows] = await db.query(`
        SELECT COALESCE(SUM(monto), 0) AS total
        FROM gasto
        WHERE DATE(fecha) = ?
        AND anulada = 0
    `, [hoy]);

    const [mesRows] = await db.query(`
        SELECT COALESCE(SUM(monto), 0) AS total
        FROM gasto
        WHERE YEAR(fecha) = YEAR(CURDATE())
        AND MONTH(fecha) = MONTH(CURDATE())
        AND anulada = 0
    `);

    const [totalRows] = await db.query(`
        SELECT COALESCE(SUM(monto), 0) AS total
        FROM gasto
        WHERE anulada = 0
    `);

    res.json({
        hoy: Number(hoyRows[0].total || 0),
        mes: Number(mesRows[0].total || 0),
        total: Number(totalRows[0].total || 0)
    });
});

exports.crearGasto = asyncHandler(async (req, res) => {
    const { descripcion, monto, fecha } = req.body;
    const idEmpleado = obtenerIdEmpleado(req);

    if (!idEmpleado) {
        return res.status(400).json({
            error: 'No se pudo identificar el empleado. Cierre sesión e inicie sesión de nuevo.'
        });
    }

    if (!descripcion || descripcion.trim() === '') {
        return res.status(400).json({
            error: 'La descripción es requerida'
        });
    }

    if (!monto || isNaN(monto) || Number(monto) <= 0) {
        return res.status(400).json({
            error: 'El monto debe ser mayor a 0'
        });
    }

    const [empleadoExiste] = await db.query(
        'SELECT id_empleado FROM empleado WHERE id_empleado = ? AND activo = 1',
        [idEmpleado]
    );

    if (empleadoExiste.length === 0) {
        return res.status(400).json({
            error: 'El empleado de la sesión no existe o está inactivo'
        });
    }

    let fechaGasto;

    if (fecha) {
        fechaGasto = `${fecha} ${new Date().toTimeString().slice(0, 8)}`;
    } else {
        fechaGasto = new Date();
    }

    const [resultado] = await db.query(`
        INSERT INTO gasto
        (fecha, descripcion, monto, id_empleado, anulada)
        VALUES (?, ?, ?, ?, 0)
    `, [
        fechaGasto,
        descripcion.trim(),
        Number(monto),
        idEmpleado
    ]);

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
        return res.status(404).json({
            error: 'Gasto no encontrado'
        });
    }

    if (gasto[0].anulada == 1) {
        return res.status(400).json({
            error: 'El gasto ya está anulado'
        });
    }

    await db.query(
        'UPDATE gasto SET anulada = 1 WHERE id_gasto = ?',
        [id]
    );

    res.json({
        mensaje: 'Gasto anulado'
    });
});