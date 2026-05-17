const db = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');

async function obtenerRecetaProducto(conn, idProducto) {
    const [rows] = await conn.query(`
        SELECT 
            rp.id_insumo,
            rp.cantidad_usada,
            i.nombre AS insumo,
            i.stock
        FROM receta_producto rp
        JOIN insumo i ON rp.id_insumo = i.id_insumo
        WHERE rp.id_producto = ?
        FOR UPDATE
    `, [idProducto]);

    return rows;
}

exports.obtenerVentas = asyncHandler(async (req, res) => {
    const [rows] = await db.query(`
        SELECT 
            v.id_venta,
            DATE(v.fecha) AS fecha,
            TIME(v.fecha) AS hora,
            v.total,
            v.id_empleado,
            v.id_cliente,
            v.anulada,
            e.nombre AS empleado,
            c.nombre AS cliente,
            GROUP_CONCAT(mp.nombre SEPARATOR ', ') AS metodos_pago
        FROM venta v
        JOIN empleado e ON v.id_empleado = e.id_empleado
        LEFT JOIN cliente c ON v.id_cliente = c.id_cliente
        LEFT JOIN pago_venta pv ON v.id_venta = pv.id_venta
        LEFT JOIN metodo_pago mp ON pv.id_metodo_pago = mp.id_metodo_pago
        GROUP BY 
            v.id_venta,
            v.fecha,
            v.total,
            v.id_empleado,
            v.id_cliente,
            v.anulada,
            e.nombre,
            c.nombre
        ORDER BY v.fecha DESC
    `);

    res.json(rows);
});

exports.obtenerDetalleVenta = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [venta] = await db.query(`
        SELECT 
            v.id_venta,
            v.fecha,
            v.total,
            v.anulada,
            e.nombre AS empleado,
            c.nombre AS cliente
        FROM venta v
        JOIN empleado e ON v.id_empleado = e.id_empleado
        LEFT JOIN cliente c ON v.id_cliente = c.id_cliente
        WHERE v.id_venta = ?
    `, [id]);

    if (venta.length === 0) {
        return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const [detalle] = await db.query(`
        SELECT 
            dv.id_detalle_venta,
            dv.id_producto,
            p.nombre AS producto,
            dv.cantidad,
            dv.precio_unitario,
            dv.subtotal,
            dv.observacion
        FROM detalle_venta dv
        JOIN producto p ON dv.id_producto = p.id_producto
        WHERE dv.id_venta = ?
        ORDER BY dv.id_detalle_venta
    `, [id]);

    const [pagos] = await db.query(`
        SELECT 
            pv.id_pago,
            pv.id_metodo_pago,
            mp.nombre AS metodo_pago,
            pv.monto,
            pv.referencia
        FROM pago_venta pv
        JOIN metodo_pago mp ON pv.id_metodo_pago = mp.id_metodo_pago
        WHERE pv.id_venta = ?
        ORDER BY pv.id_pago
    `, [id]);

    res.json({
        venta: venta[0],
        detalle,
        pagos
    });
});

exports.obtenerMetodosPago = asyncHandler(async (req, res) => {
    const [rows] = await db.query(`
        SELECT 
            id_metodo_pago,
            nombre,
            activo
        FROM metodo_pago
        WHERE activo = 1
        ORDER BY nombre
    `);

    res.json(rows);
});

exports.crearVenta = asyncHandler(async (req, res) => {
    const { productos, pagos, id_cliente } = req.body;
    const idEmpleado = req.empleado?.id;

    if (!idEmpleado) {
        return res.status(400).json({ error: 'No se pudo identificar el empleado' });
    }

    if (!productos || !Array.isArray(productos) || productos.length === 0) {
        return res.status(400).json({ error: 'Debe agregar al menos un producto' });
    }

    if (!pagos || !Array.isArray(pagos) || pagos.length === 0) {
        return res.status(400).json({ error: 'Debe agregar al menos un método de pago' });
    }

    for (const p of productos) {
        if (!p.id_producto) {
            return res.status(400).json({ error: 'Cada producto debe tener id_producto' });
        }

        if (!p.cantidad || isNaN(p.cantidad) || Number(p.cantidad) <= 0) {
            return res.status(400).json({ error: 'La cantidad del producto debe ser mayor a 0' });
        }

        if (p.precio === undefined || isNaN(p.precio) || Number(p.precio) <= 0) {
            return res.status(400).json({ error: 'El precio del producto debe ser válido' });
        }
    }

    for (const pago of pagos) {
        if (!pago.id_metodo_pago) {
            return res.status(400).json({ error: 'Cada pago debe tener método de pago' });
        }

        if (!pago.monto || isNaN(pago.monto) || Number(pago.monto) <= 0) {
            return res.status(400).json({ error: 'El monto del pago debe ser mayor a 0' });
        }
    }

    const totalProductos = productos.reduce((acc, p) => {
        return acc + Number(p.cantidad) * Number(p.precio);
    }, 0);

    const totalPagos = pagos.reduce((acc, p) => {
        return acc + Number(p.monto);
    }, 0);

    if (Number(totalPagos.toFixed(2)) !== Number(totalProductos.toFixed(2))) {
        return res.status(400).json({
            error: `El total de pagos (${totalPagos.toFixed(2)}) no coincide con el total de la venta (${totalProductos.toFixed(2)})`
        });
    }

    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
        for (const p of productos) {
            const [productoExiste] = await conn.query(
                'SELECT id_producto, nombre FROM producto WHERE id_producto = ? AND activo = 1',
                [p.id_producto]
            );

            if (productoExiste.length === 0) {
                throw Object.assign(
                    new Error(`Producto no encontrado o inactivo: ${p.id_producto}`),
                    { statusCode: 404 }
                );
            }

            const receta = await obtenerRecetaProducto(conn, p.id_producto);

            if (receta.length === 0) {
                throw Object.assign(
                    new Error(`El producto "${productoExiste[0].nombre}" no tiene receta configurada`),
                    { statusCode: 400 }
                );
            }

            for (const item of receta) {
                const necesario = Number(item.cantidad_usada) * Number(p.cantidad);
                const disponible = Number(item.stock);

                if (necesario > disponible) {
                    throw Object.assign(
                        new Error(`Stock insuficiente de ${item.insumo}. Disponible: ${disponible}, necesario: ${necesario}`),
                        { statusCode: 400 }
                    );
                }
            }
        }

        for (const pago of pagos) {
            const [metodoExiste] = await conn.query(
                'SELECT id_metodo_pago FROM metodo_pago WHERE id_metodo_pago = ? AND activo = 1',
                [pago.id_metodo_pago]
            );

            if (metodoExiste.length === 0) {
                throw Object.assign(
                    new Error('Método de pago no válido'),
                    { statusCode: 400 }
                );
            }
        }

        const [resultadoVenta] = await conn.query(
            `INSERT INTO venta
            (fecha, total, id_empleado, id_cliente, anulada)
            VALUES (NOW(), ?, ?, ?, 0)`,
            [totalProductos, idEmpleado, id_cliente || 1]
        );

        const idVenta = resultadoVenta.insertId;

        for (const p of productos) {
            const subtotal = Number(p.cantidad) * Number(p.precio);

            await conn.query(
                `INSERT INTO detalle_venta
                (id_venta, id_producto, cantidad, precio_unitario, subtotal, observacion)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    idVenta,
                    p.id_producto,
                    p.cantidad,
                    p.precio,
                    subtotal,
                    p.observacion || null
                ]
            );

            const receta = await obtenerRecetaProducto(conn, p.id_producto);

            for (const item of receta) {
                const cantidadDescontar = Number(item.cantidad_usada) * Number(p.cantidad);
                const stockAnterior = Number(item.stock);
                const stockNuevo = stockAnterior - cantidadDescontar;

                await conn.query(
                    'UPDATE insumo SET stock = ? WHERE id_insumo = ?',
                    [stockNuevo, item.id_insumo]
                );

                await conn.query(
                    `INSERT INTO movimiento_inventario
                    (id_insumo, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, id_referencia, id_empleado)
                    VALUES (?, 'venta', ?, ?, ?, ?, ?, ?)`,
                    [
                        item.id_insumo,
                        cantidadDescontar,
                        stockAnterior,
                        stockNuevo,
                        `Venta #${idVenta}`,
                        idVenta,
                        idEmpleado
                    ]
                );
            }
        }

        for (const pago of pagos) {
            await conn.query(
                `INSERT INTO pago_venta
                (id_venta, id_metodo_pago, monto, referencia)
                VALUES (?, ?, ?, ?)`,
                [
                    idVenta,
                    pago.id_metodo_pago,
                    pago.monto,
                    pago.referencia || null
                ]
            );
        }

        const numeroComprobante = `T-${String(idVenta).padStart(6, '0')}`;

        await conn.query(
            `INSERT INTO comprobante
            (id_venta, numero, fecha, nombre_cliente, nit_cliente, total)
            VALUES (?, ?, NOW(), ?, ?, ?)`,
            [
                idVenta,
                numeroComprobante,
                'Consumidor final',
                'CF',
                totalProductos
            ]
        );

        await conn.commit();

        res.json({
            mensaje: 'Venta registrada',
            id_venta: idVenta,
            total: totalProductos,
            comprobante: numeroComprobante
        });

    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
});

exports.anularVenta = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const idEmpleado = req.empleado?.id || null;

    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
        const [venta] = await conn.query(
            'SELECT id_venta, anulada FROM venta WHERE id_venta = ? FOR UPDATE',
            [id]
        );

        if (venta.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Venta no encontrada' });
        }

        if (venta[0].anulada == 1) {
            await conn.rollback();
            return res.status(400).json({ error: 'La venta ya está anulada' });
        }

        const [detalles] = await conn.query(
            'SELECT id_producto, cantidad FROM detalle_venta WHERE id_venta = ?',
            [id]
        );

        for (const detalle of detalles) {
            const receta = await obtenerRecetaProducto(conn, detalle.id_producto);

            for (const item of receta) {
                const cantidadRegresar = Number(item.cantidad_usada) * Number(detalle.cantidad);
                const stockAnterior = Number(item.stock);
                const stockNuevo = stockAnterior + cantidadRegresar;

                await conn.query(
                    'UPDATE insumo SET stock = ? WHERE id_insumo = ?',
                    [stockNuevo, item.id_insumo]
                );

                await conn.query(
                    `INSERT INTO movimiento_inventario
                    (id_insumo, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, id_referencia, id_empleado)
                    VALUES (?, 'anulacion_venta', ?, ?, ?, ?, ?, ?)`,
                    [
                        item.id_insumo,
                        cantidadRegresar,
                        stockAnterior,
                        stockNuevo,
                        `Anulación venta #${id}`,
                        id,
                        idEmpleado
                    ]
                );
            }
        }

        await conn.query(
            'UPDATE venta SET anulada = 1 WHERE id_venta = ?',
            [id]
        );

        await conn.commit();

        res.json({ mensaje: 'Venta anulada y stock revertido' });

    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
});

exports.obtenerVentasPorFecha = asyncHandler(async (req, res) => {
    const { fecha_inicio, fecha_fin } = req.query;

    let query = `
        SELECT 
            v.id_venta,
            DATE(v.fecha) AS fecha,
            TIME(v.fecha) AS hora,
            v.total,
            v.anulada,
            e.nombre AS empleado,
            GROUP_CONCAT(mp.nombre SEPARATOR ', ') AS metodos_pago
        FROM venta v
        JOIN empleado e ON v.id_empleado = e.id_empleado
        LEFT JOIN pago_venta pv ON v.id_venta = pv.id_venta
        LEFT JOIN metodo_pago mp ON pv.id_metodo_pago = mp.id_metodo_pago
        WHERE v.anulada = 0
    `;

    let params = [];

    if (fecha_inicio && fecha_fin) {
        query += ' AND DATE(v.fecha) BETWEEN ? AND ?';
        params = [fecha_inicio, fecha_fin];
    } else if (fecha_inicio) {
        query += ' AND DATE(v.fecha) >= ?';
        params = [fecha_inicio];
    } else if (fecha_fin) {
        query += ' AND DATE(v.fecha) <= ?';
        params = [fecha_fin];
    }

    query += `
        GROUP BY 
            v.id_venta,
            v.fecha,
            v.total,
            v.anulada,
            e.nombre
        ORDER BY v.fecha DESC
    `;

    const [rows] = await db.query(query, params);

    res.json(rows);
});

exports.obtenerTicketVenta = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [ventaRows] = await db.query(`
        SELECT 
            v.id_venta,
            v.fecha,
            DATE(v.fecha) AS fecha_solo,
            TIME(v.fecha) AS hora_solo,
            v.total,
            v.anulada,
            e.nombre AS empleado,
            c.nombre AS cliente,
            c.nit,
            comp.numero AS numero_comprobante
        FROM venta v
        JOIN empleado e ON v.id_empleado = e.id_empleado
        LEFT JOIN cliente c ON v.id_cliente = c.id_cliente
        LEFT JOIN comprobante comp ON v.id_venta = comp.id_venta
        WHERE v.id_venta = ?
    `, [id]);

    if (ventaRows.length === 0) {
        return res.status(404).json({
            error: 'Venta no encontrada'
        });
    }

    const venta = ventaRows[0];

    const [detalleRows] = await db.query(`
        SELECT 
            p.nombre AS producto,
            dv.cantidad,
            dv.precio_unitario,
            dv.subtotal,
            dv.observacion
        FROM detalle_venta dv
        JOIN producto p ON dv.id_producto = p.id_producto
        WHERE dv.id_venta = ?
        ORDER BY dv.id_detalle_venta
    `, [id]);

    const [pagosRows] = await db.query(`
        SELECT 
            mp.nombre AS metodo_pago,
            pv.monto,
            pv.referencia
        FROM pago_venta pv
        JOIN metodo_pago mp ON pv.id_metodo_pago = mp.id_metodo_pago
        WHERE pv.id_venta = ?
        ORDER BY pv.id_pago
    `, [id]);

    res.json({
        negocio: {
            nombre: 'QUESSABROSURA',
            direccion: 'Local de comida rápida',
            telefono: ''
        },
        venta,
        detalle: detalleRows,
        pagos: pagosRows
    });
});