const db = require('../db');

exports.obtenerCortes = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM corte ORDER BY fecha DESC, hora DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.crearCorte = async (req, res) => {
    const { entrada, salida, observaciones } = req.body;

    try {
        const [resultado] = await db.query(
            'INSERT INTO corte (fecha, hora, entrada, salida, observaciones) VALUES (CURDATE(), CURTIME(), ?, ?, ?)',
            [entrada, salida, observaciones]
        );

        res.json({ mensaje: 'Corte registrado', id_corte: resultado.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.obtenerCorteDelDia = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM corte WHERE fecha = CURDATE() ORDER BY hora DESC LIMIT 1'
        );

        if (rows.length === 0) {
            return res.json({ mensaje: 'No hay corte registrado hoy' });
        }

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.obtenerResumenDelDia = async (req, res) => {
    try {
        const fecha = new Date().toISOString().split('T')[0];

        const [ventas] = await db.query(
            `SELECT 
                SUM(total) as total_ventas,
                SUM(CASE WHEN metodo_pago = 'Efectivo' THEN total ELSE 0 END) as efectivo,
                SUM(CASE WHEN metodo_pago = 'Tarjeta' THEN total ELSE 0 END) as tarjeta,
                COUNT(*) as cantidad_ventas
            FROM venta WHERE fecha = ?`,
            [fecha]
        );

        const [gastos] = await db.query(
            'SELECT SUM(monto) as total_gastos FROM gasto WHERE fecha = ?',
            [fecha]
        );

        const [corte] = await db.query(
            'SELECT entrada FROM corte WHERE fecha = ? ORDER BY hora DESC LIMIT 1',
            [fecha]
        );

        res.json({
            fecha,
            ventas: ventas[0],
            gastos: gastos[0].total_gastos || 0,
            entrada: corte.length > 0 ? corte[0].entrada : 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.eliminarCorte = async (req, res) => {
    const { id } = req.params;

    try {
        await db.query('DELETE FROM corte WHERE id_corte = ?', [id]);
        res.json({ mensaje: 'Corte eliminado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};