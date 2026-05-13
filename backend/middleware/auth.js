const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

function generarToken(empleado) {
    return jwt.sign(
        { id: empleado.id_empleado, nombre: empleado.nombre, usuario: empleado.usuario, rol: empleado.rol },
        JWT_SECRET,
        { expiresIn: '12h' }
    );
}

function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.empleado = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
}

module.exports = { generarToken, verificarToken };
