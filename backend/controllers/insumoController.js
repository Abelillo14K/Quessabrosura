const db = require('../db');

exports.obtenerInsumos = async (req, res) => {
    const [rows] = await db.query(`
        SELECT 
            id_insumo,
            nombre,
            unidad_medida,
            stock,
            stock_minimo,
            costo_unitario,
            activo,
            fecha_creacion,
            CASE
                WHEN stock <= 0 THEN 'agotado'
                WHEN stock <= stock_minimo THEN 'bajo'
                ELSE 'suficiente'
            END AS estado_stock
        FROM insumo
        ORDER BY nombre
    `);

    res.json(rows);
};

exports.obtenerInsumo = async (req, res) => {
    const { id } = req.params;

    const [rows] = await db.query(`
        SELECT 
            id_insumo,
            nombre,
            unidad_medida,
            stock,
            stock_minimo,
            costo_unitario,
            activo,
            fecha_creacion,
            CASE
                WHEN stock <= 0 THEN 'agotado'
                WHEN stock <= stock_minimo THEN 'bajo'
                ELSE 'suficiente'
            END AS estado_stock
        FROM insumo
        WHERE id_insumo = ?
    `, [id]);

    if (rows.length === 0) {
        return res.status(404).json({ error: 'Insumo no encontrado' });
    }

    res.json(rows[0]);
};

exports.crearInsumo = async (req, res) => {
    const {
        nombre,
        unidad_medida,
        stock,
        stock_minimo,
        costo_unitario
    } = req.body;

    if (!nombre || !unidad_medida) {
        return res.status(400).json({
            error: 'Nombre y unidad de medida son requeridos'
        });
    }

    const stockInicial = Number(stock || 0);
    const stockMinimo = Number(stock_minimo || 0);
    const costo = Number(costo_unitario || 0);

    if (stockInicial < 0 || stockMinimo < 0 || costo < 0) {
        return res.status(400).json({
            error: 'Stock, stock mínimo y costo no pueden ser negativos'
        });
    }

    const [resultado] = await db.query(
        `INSERT INTO insumo
        (nombre, unidad_medida, stock, stock_minimo, costo_unitario, activo)
        VALUES (?, ?, ?, ?, ?, 1)`,
        [
            nombre.trim(),
            unidad_medida.trim(),
            stockInicial,
            stockMinimo,
            costo
        ]
    );

    res.json({
        mensaje: 'Insumo creado',
        id_insumo: resultado.insertId
    });
};

exports.actualizarInsumo = async (req, res) => {
    const { id } = req.params;

    const {
        nombre,
        unidad_medida,
        stock_minimo,
        costo_unitario,
        activo
    } = req.body;

    if (!nombre || !unidad_medida) {
        return res.status(400).json({
            error: 'Nombre y unidad de medida son requeridos'
        });
    }

    const stockMinimo = Number(stock_minimo || 0);
    const costo = Number(costo_unitario || 0);

    if (stockMinimo < 0 || costo < 0) {
        return res.status(400).json({
            error: 'Stock mínimo y costo no pueden ser negativos'
        });
    }

    const [resultado] = await db.query(
        `UPDATE insumo
         SET nombre = ?, unidad_medida = ?, stock_minimo = ?, costo_unitario = ?, activo = ?
         WHERE id_insumo = ?`,
        [
            nombre.trim(),
            unidad_medida.trim(),
            stockMinimo,
            costo,
            activo ? 1 : 0,
            id
        ]
    );

    if (resultado.affectedRows === 0) {
        return res.status(404).json({ error: 'Insumo no encontrado' });
    }

    res.json({ mensaje: 'Insumo actualizado' });
};

exports.ajustarStock = async (req, res) => {
    const { id } = req.params;
    const { tipo_movimiento, cantidad, motivo } = req.body;

    if (!tipo_movimiento || !['entrada', 'salida', 'ajuste'].includes(tipo_movimiento)) {
        return res.status(400).json({
            error: 'Tipo de movimiento inválido. Use entrada, salida o ajuste'
        });
    }

    if (cantidad === undefined || isNaN(cantidad) || Number(cantidad) < 0) {
        return res.status(400).json({
            error: 'La cantidad debe ser válida'
        });
    }

    if ((tipo_movimiento === 'entrada' || tipo_movimiento === 'salida') && Number(cantidad) <= 0) {
        return res.status(400).json({
            error: 'La cantidad debe ser mayor a 0'
        });
    }

    const idEmpleado = req.empleado?.id || null;

    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
        const [rows] = await conn.query(
            'SELECT stock FROM insumo WHERE id_insumo = ? FOR UPDATE',
            [id]
        );

        if (rows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Insumo no encontrado' });
        }

        const stockAnterior = Number(rows[0].stock);
        let stockNuevo = stockAnterior;

        if (tipo_movimiento === 'entrada') {
            stockNuevo = stockAnterior + Number(cantidad);
        }

        if (tipo_movimiento === 'salida') {
            stockNuevo = stockAnterior - Number(cantidad);

            if (stockNuevo < 0) {
                throw Object.assign(
                    new Error('No hay suficiente stock para realizar la salida'),
                    { statusCode: 400 }
                );
            }
        }

        if (tipo_movimiento === 'ajuste') {
            stockNuevo = Number(cantidad);
        }

        await conn.query(
            'UPDATE insumo SET stock = ? WHERE id_insumo = ?',
            [stockNuevo, id]
        );

        await conn.query(
            `INSERT INTO movimiento_inventario
            (id_insumo, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, id_empleado)
            VALUES (?, 'ajuste_manual', ?, ?, ?, ?, ?)`,
            [
                id,
                Number(cantidad),
                stockAnterior,
                stockNuevo,
                motivo || 'Ajuste manual de inventario',
                idEmpleado
            ]
        );

        await conn.commit();

        res.json({
            mensaje: 'Stock actualizado',
            stock_anterior: stockAnterior,
            stock_nuevo: stockNuevo
        });

    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

exports.desactivarInsumo = async (req, res) => {
    const { id } = req.params;

    const [recetas] = await db.query(
        'SELECT id_receta FROM receta_producto WHERE id_insumo = ? LIMIT 1',
        [id]
    );

    if (recetas.length > 0) {
        return res.status(400).json({
            error: 'No se puede desactivar el insumo porque está siendo usado en recetas'
        });
    }

    const [resultado] = await db.query(
        'UPDATE insumo SET activo = 0 WHERE id_insumo = ?',
        [id]
    );

    if (resultado.affectedRows === 0) {
        return res.status(404).json({ error: 'Insumo no encontrado' });
    }

    res.json({ mensaje: 'Insumo desactivado' });
};

exports.obtenerMovimientos = async (req, res) => {
    const [rows] = await db.query(`
        SELECT 
            m.id_movimiento,
            m.id_insumo,
            i.nombre AS insumo,
            m.tipo_movimiento,
            m.cantidad,
            m.stock_anterior,
            m.stock_nuevo,
            m.motivo,
            m.id_referencia,
            m.fecha,
            e.nombre AS empleado
        FROM movimiento_inventario m
        JOIN insumo i ON m.id_insumo = i.id_insumo
        LEFT JOIN empleado e ON m.id_empleado = e.id_empleado
        ORDER BY m.fecha DESC, m.id_movimiento DESC
        LIMIT 200
    `);

    res.json(rows);
};