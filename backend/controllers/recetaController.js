const db = require('../db');

exports.obtenerTodasLasRecetas = async (req, res) => {
    const [rows] = await db.query(`
        SELECT 
            rp.id_receta,
            rp.id_producto,
            p.nombre AS producto,
            c.nombre AS categoria,
            rp.id_insumo,
            i.nombre AS insumo,
            i.unidad_medida,
            rp.cantidad_usada
        FROM receta_producto rp
        JOIN producto p ON rp.id_producto = p.id_producto
        JOIN categoria_producto c ON p.id_categoria = c.id_categoria
        JOIN insumo i ON rp.id_insumo = i.id_insumo
        ORDER BY p.nombre, i.nombre
    `);

    res.json(rows);
};

exports.obtenerRecetaProducto = async (req, res) => {
    const { id_producto } = req.params;

    const [producto] = await db.query(`
        SELECT 
            p.id_producto,
            p.nombre,
            p.descripcion,
            p.precio_venta,
            p.activo,
            c.nombre AS categoria
        FROM producto p
        JOIN categoria_producto c ON p.id_categoria = c.id_categoria
        WHERE p.id_producto = ?
    `, [id_producto]);

    if (producto.length === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const [receta] = await db.query(`
        SELECT 
            rp.id_receta,
            rp.id_producto,
            rp.id_insumo,
            i.nombre AS insumo,
            i.unidad_medida,
            i.stock,
            i.stock_minimo,
            rp.cantidad_usada
        FROM receta_producto rp
        JOIN insumo i ON rp.id_insumo = i.id_insumo
        WHERE rp.id_producto = ?
        ORDER BY i.nombre
    `, [id_producto]);

    res.json({
        producto: producto[0],
        receta
    });
};

exports.guardarRecetaProducto = async (req, res) => {
    const { id_producto } = req.params;
    const { insumos } = req.body;

    if (!insumos || !Array.isArray(insumos) || insumos.length === 0) {
        return res.status(400).json({
            error: 'Debe agregar al menos un insumo a la receta'
        });
    }

    const [producto] = await db.query(
        'SELECT id_producto FROM producto WHERE id_producto = ?',
        [id_producto]
    );

    if (producto.length === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const idsUsados = new Set();

    for (const item of insumos) {
        if (!item.id_insumo) {
            return res.status(400).json({
                error: 'Cada item debe tener un insumo seleccionado'
            });
        }

        if (!item.cantidad_usada || isNaN(item.cantidad_usada) || Number(item.cantidad_usada) <= 0) {
            return res.status(400).json({
                error: 'La cantidad usada debe ser mayor a 0'
            });
        }

        if (idsUsados.has(Number(item.id_insumo))) {
            return res.status(400).json({
                error: 'No puede repetir el mismo insumo en una receta'
            });
        }

        idsUsados.add(Number(item.id_insumo));

        const [insumo] = await db.query(
            'SELECT id_insumo FROM insumo WHERE id_insumo = ? AND activo = 1',
            [item.id_insumo]
        );

        if (insumo.length === 0) {
            return res.status(404).json({
                error: `El insumo con ID ${item.id_insumo} no existe o está inactivo`
            });
        }
    }

    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
        await conn.query(
            'DELETE FROM receta_producto WHERE id_producto = ?',
            [id_producto]
        );

        for (const item of insumos) {
            await conn.query(
                `INSERT INTO receta_producto
                (id_producto, id_insumo, cantidad_usada)
                VALUES (?, ?, ?)`,
                [
                    id_producto,
                    item.id_insumo,
                    item.cantidad_usada
                ]
            );
        }

        await conn.commit();

        res.json({ mensaje: 'Receta guardada correctamente' });

    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

exports.eliminarDetalleReceta = async (req, res) => {
    const { id_receta } = req.params;

    const [resultado] = await db.query(
        'DELETE FROM receta_producto WHERE id_receta = ?',
        [id_receta]
    );

    if (resultado.affectedRows === 0) {
        return res.status(404).json({
            error: 'Detalle de receta no encontrado'
        });
    }

    res.json({ mensaje: 'Insumo eliminado de la receta' });
};