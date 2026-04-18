const db = require('../db');

exports.obtenerVentas = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM venta ORDER BY fecha DESC, hora DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.crearVenta = async (req, res) => {
    const { productos, metodo_pago, id_empleado } = req.body;

    try {
        let total = 0;
        productos.forEach(p => {
            total += p.cantidad * p.precio;
        });

        const [resultado] = await db.query(
            'INSERT INTO venta (fecha, hora, total, metodo_pago, id_empleado) VALUES (CURDATE(), CURTIME(), ?, ?, ?)',
            [total, metodo_pago, id_empleado]
        );

        const id_venta = resultado.insertId;

        for (let p of productos) {
            await db.query(
                `INSERT INTO detalle_venta (cantidad, precio_venta, subtotal, id_venta, id_producto)
                VALUES (?, ?, ?, ?, ?)`,
                [p.cantidad, p.precio, p.cantidad * p.precio, id_venta, p.id_producto]
            );
        }

        res.json({ mensaje: 'Venta registrada', id_venta });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.obtenerVentasPorFecha = async (req, res) => {
    const { fecha_inicio, fecha_fin } = req.query;

    try {
        let query = 'SELECT * FROM venta';
        let params = [];

        if (fecha_inicio && fecha_fin) {
            query += ' WHERE fecha BETWEEN ? AND ?';
            params = [fecha_inicio, fecha_fin];
        } else if (fecha_inicio) {
            query += ' WHERE fecha >= ?';
            params = [fecha_inicio];
        } else if (fecha_fin) {
            query += ' WHERE fecha <= ?';
            params = [fecha_fin];
        }

        query += ' ORDER BY fecha DESC, hora DESC';

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};