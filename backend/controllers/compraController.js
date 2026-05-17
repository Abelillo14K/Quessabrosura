const db = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');

exports.obtenerCompras = asyncHandler(async (req, res) => {
    const [rows] = await db.query(`
        SELECT 
            c.id_compra,
            DATE(c.fecha) AS fecha,
            TIME(c.fecha) AS hora,
            c.total,
            c.anulada,
            e.nombre AS empleado,
            p.nombre AS proveedor
        FROM compra c
        JOIN empleado e ON c.id_empleado = e.id_empleado
        LEFT JOIN proveedor p ON c.id_proveedor = p.id_proveedor
        ORDER BY c.fecha DESC
    `);

    res.json(rows);
});

exports.obtenerDetalleCompra = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [compra] = await db.query(`
        SELECT 
            c.id_compra,
            c.fecha,
            c.total,
            c.anulada,
            e.nombre AS empleado,
            p.nombre AS proveedor
        FROM compra c
        JOIN empleado e ON c.id_empleado = e.id_empleado
        LEFT JOIN proveedor p ON c.id_proveedor = p.id_proveedor
        WHERE c.id_compra = ?
    `, [id]);

    if (compra.length === 0) {
        return res.status(404).json({ error: 'Compra no encontrada' });
    }

    const [detalle] = await db.query(`
        SELECT 
            dc.id_detalle_compra,
            dc.id_insumo,
            i.nombre AS insumo,
            i.unidad_medida,
            dc.cantidad,
            dc.precio_unitario,
            dc.subtotal
        FROM detalle_compra dc
        JOIN insumo i ON dc.id_insumo = i.id_insumo
        WHERE dc.id_compra = ?
        ORDER BY dc.id_detalle_compra
    `, [id]);

    res.json({
        compra: compra[0],
        detalle
    });
});

exports.crearCompra = asyncHandler(async (req, res) => {
    const { insumos, id_proveedor } = req.body;
    const idEmpleado = req.empleado?.id;

    if (!idEmpleado) {
        return res.status(400).json({ error: 'No se pudo identificar el empleado' });
    }

    if (!insumos || !Array.isArray(insumos) || insumos.length === 0) {
        return res.status(400).json({ error: 'Debe agregar al menos un insumo a la compra' });
    }

    for (const item of insumos) {
        if (!item.id_insumo) {
            return res.status(400).json({ error: 'Cada item debe tener id_insumo' });
        }

        if (!item.cantidad || isNaN(item.cantidad) || Number(item.cantidad) <= 0) {
            return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
        }

        if (item.precio_unitario === undefined || isNaN(item.precio_unitario) || Number(item.precio_unitario) < 0) {
            return res.status(400).json({ error: 'El precio unitario debe ser válido' });
        }
    }

    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
        let total = 0;

        for (const item of insumos) {
            total += Number(item.cantidad) * Number(item.precio_unitario);
        }

        const [resultadoCompra] = await conn.query(`
            INSERT INTO compra
            (fecha, total, id_empleado, id_proveedor, anulada)
            VALUES (NOW(), ?, ?, ?, 0)
        `, [
            total,
            idEmpleado,
            id_proveedor || null
        ]);

        const idCompra = resultadoCompra.insertId;

        for (const item of insumos) {
            const [insumoRows] = await conn.query(
                'SELECT id_insumo, stock FROM insumo WHERE id_insumo = ? AND activo = 1 FOR UPDATE',
                [item.id_insumo]
            );

            if (insumoRows.length === 0) {
                throw Object.assign(
                    new Error(`Insumo no encontrado o inactivo: ${item.id_insumo}`),
                    { statusCode: 404 }
                );
            }

            const cantidad = Number(item.cantidad);
            const precioUnitario = Number(item.precio_unitario);
            const subtotal = cantidad * precioUnitario;

            await conn.query(`
                INSERT INTO detalle_compra
                (id_compra, id_insumo, cantidad, precio_unitario, subtotal)
                VALUES (?, ?, ?, ?, ?)
            `, [
                idCompra,
                item.id_insumo,
                cantidad,
                precioUnitario,
                subtotal
            ]);

            const stockAnterior = Number(insumoRows[0].stock || 0);
            const stockNuevo = stockAnterior + cantidad;

            await conn.query(
                'UPDATE insumo SET stock = ?, costo_unitario = ? WHERE id_insumo = ?',
                [stockNuevo, precioUnitario, item.id_insumo]
            );

            await conn.query(`
                INSERT INTO movimiento_inventario
                (id_insumo, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, id_referencia, id_empleado)
                VALUES (?, 'compra', ?, ?, ?, ?, ?, ?)
            `, [
                item.id_insumo,
                cantidad,
                stockAnterior,
                stockNuevo,
                `Compra #${idCompra}`,
                idCompra,
                idEmpleado
            ]);
        }

        await conn.commit();

        res.json({
            mensaje: 'Compra registrada',
            id_compra: idCompra,
            total
        });

    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
});

exports.anularCompra = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const idEmpleado = req.empleado?.id || null;

    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
        const [compraRows] = await conn.query(
            'SELECT id_compra, anulada FROM compra WHERE id_compra = ? FOR UPDATE',
            [id]
        );

        if (compraRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Compra no encontrada' });
        }

        if (compraRows[0].anulada == 1) {
            await conn.rollback();
            return res.status(400).json({ error: 'La compra ya está anulada' });
        }

        const [detalles] = await conn.query(
            'SELECT id_insumo, cantidad FROM detalle_compra WHERE id_compra = ?',
            [id]
        );

        for (const detalle of detalles) {
            const [insumoRows] = await conn.query(
                'SELECT stock FROM insumo WHERE id_insumo = ? FOR UPDATE',
                [detalle.id_insumo]
            );

            if (insumoRows.length === 0) {
                throw Object.assign(
                    new Error(`Insumo no encontrado: ${detalle.id_insumo}`),
                    { statusCode: 404 }
                );
            }

            const stockAnterior = Number(insumoRows[0].stock || 0);
            const cantidadRestar = Number(detalle.cantidad);
            const stockNuevo = stockAnterior - cantidadRestar;

            if (stockNuevo < 0) {
                throw Object.assign(
                    new Error('No se puede anular la compra porque dejaría stock negativo'),
                    { statusCode: 400 }
                );
            }

            await conn.query(
                'UPDATE insumo SET stock = ? WHERE id_insumo = ?',
                [stockNuevo, detalle.id_insumo]
            );

            await conn.query(`
                INSERT INTO movimiento_inventario
                (id_insumo, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, id_referencia, id_empleado)
                VALUES (?, 'anulacion_compra', ?, ?, ?, ?, ?, ?)
            `, [
                detalle.id_insumo,
                cantidadRestar,
                stockAnterior,
                stockNuevo,
                `Anulación compra #${id}`,
                id,
                idEmpleado
            ]);
        }

        await conn.query(
            'UPDATE compra SET anulada = 1 WHERE id_compra = ?',
            [id]
        );

        await conn.commit();

        res.json({ mensaje: 'Compra anulada y stock revertido' });

    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
});