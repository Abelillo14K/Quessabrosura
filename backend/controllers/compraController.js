const db = require('../db');

// obtener compras
exports.obtenerCompras = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM compra');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// crear compra
exports.crearCompra = async (req, res) => {
    const { productos } = req.body;

    try {
        let total = 0;

        // calcular total
        productos.forEach(p => {
            total += p.cantidad * p.precio;
        });

        // insertar compra
        const [resultado] = await db.query(
            'INSERT INTO compra (fecha, total) VALUES (CURDATE(), ?)',
            [total]
        );

        const id_compra = resultado.insertId;

        // insertar detalles
        for (let p of productos) {
            await db.query(
                `INSERT INTO detalle_compra 
                (cantidad, precio_compra, subtotal, id_compra, id_producto)
                VALUES (?, ?, ?, ?, ?)`,
                [
                    p.cantidad,
                    p.precio,
                    p.cantidad * p.precio,
                    id_compra,
                    p.id_producto
                ]
            );
        }

        res.json({ mensaje: 'Compra registrada' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};