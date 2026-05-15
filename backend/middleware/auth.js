const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

function generarToken(empleado) {
    return jwt.sign(
        {
            id: empleado.id_empleado,
            nombre: empleado.nombre,
            usuario: empleado.usuario,
            rol: empleado.rol
        },
        JWT_SECRET,
        { expiresIn: '12h' }
    );
}

function verificarToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.empleado = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
}

function autorizarRoles(...rolesPermitidos) {
    return (req, res, next) => {
        if (!req.empleado || !rolesPermitidos.includes(req.empleado.rol)) {
            return res.status(403).json({ error: 'No tiene permisos para realizar esta acción' });
        }

        next();
    };
}

module.exports = { generarToken, verificarToken, autorizarRoles };