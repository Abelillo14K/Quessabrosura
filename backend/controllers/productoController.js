const db = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');

exports.obtenerProductos = asyncHandler(async (req, res) => {
    const [rows] = await db.query(`
        SELECT 
            p.id_producto,
            p.nombre,
            p.tipo,
            p.precio_venta,
            p.activo,
            COALESCE(i.stock, 0) AS stock,
            COALESCE(i.stock_minimo, 0) AS stock_minimo
        FROM producto p
        LEFT JOIN inventario i ON p.id_producto = i.id_producto
        ORDER BY p.nombre
    `);

    res.json(rows);
});

exports.obtenerProducto = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [rows] = await db.query(`
        SELECT 
            p.id_producto,
            p.nombre,
            p.tipo,
            p.precio_venta,
            p.activo,
            COALESCE(i.stock, 0) AS stock,
            COALESCE(i.stock_minimo, 0) AS stock_minimo
        FROM producto p
        LEFT JOIN inventario i ON p.id_producto = i.id_producto
        WHERE p.id_producto = ?
    `, [id]);

    if (rows.length === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(rows[0]);
});

exports.crearProducto = asyncHandler(async (req, res) => {
    const { nombre, tipo, precio_venta, activo, stock, stock_minimo } = req.body;

    if (!nombre || !tipo || precio_venta === undefined) {
        return res.status(400).json({ error: 'Nombre, tipo y precio de venta son requeridos' });
    }

    if (isNaN(precio_venta) || Number(precio_venta) < 0) {
        return res.status(400).json({ error: 'El precio debe ser un número válido' });
    }

    const stockInicial = stock !== undefined ? Number(stock) : 0;
    const stockMinimo = stock_minimo !== undefined ? Number(stock_minimo) : 5;

    if (isNaN(stockInicial) || stockInicial < 0) {
        return res.status(400).json({ error: 'El stock debe ser un número válido' });
    }

    if (isNaN(stockMinimo) || stockMinimo < 0) {
        return res.status(400).json({ error: 'El stock mínimo debe ser un número válido' });
    }

    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
        const [resultado] = await conn.query(
            `INSERT INTO producto (nombre, tipo, precio_venta, activo)
             VALUES (?, ?, ?, ?)`,
            [nombre.trim(), tipo.trim(), precio_venta, activo !== undefined ? activo : 1]
        );

        const idProducto = resultado.insertId;

        await conn.query(
            `INSERT INTO inventario (id_producto, stock, stock_minimo)
             VALUES (?, ?, ?)`,
            [idProducto, stockInicial, stockMinimo]
        );

        await conn.commit();

        res.json({
            mensaje: 'Producto creado',
            id_producto: idProducto
        });

    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
});

exports.actualizarProducto = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { nombre, tipo, precio_venta, activo } = req.body;

    if (!nombre || !tipo || precio_venta === undefined) {
        return res.status(400).json({ error: 'Nombre, tipo y precio de venta son requeridos' });
    }

    if (isNaN(precio_venta) || Number(precio_venta) < 0) {
        return res.status(400).json({ error: 'El precio debe ser un número válido' });
    }

    const [result] = await db.query(
        `UPDATE producto
         SET nombre = ?, tipo = ?, precio_venta = ?, activo = ?
         WHERE id_producto = ?`,
        [nombre.trim(), tipo.trim(), precio_venta, activo !== undefined ? activo : 1, id]
    );

    if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ mensaje: 'Producto actualizado' });
});

exports.eliminarProducto = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [result] = await db.query(
        'UPDATE producto SET activo = 0 WHERE id_producto = ?',
        [id]
    );

    if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ mensaje: 'Producto desactivado' });
});

exports.actualizarActivo = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { activo } = req.body;

    if (activo === undefined) {
        return res.status(400).json({ error: 'Debe enviar el estado activo' });
    }

    const [result] = await db.query(
        'UPDATE producto SET activo = ? WHERE id_producto = ?',
        [activo ? 1 : 0, id]
    );

    if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({
        mensaje: activo ? 'Producto activado' : 'Producto desactivado'
    });
});