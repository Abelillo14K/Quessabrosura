const jwt = require('jsonwebtoken');

function generarToken(empleado) {
    return jwt.sign(
        {
            id: empleado.id_empleado || empleado.id,
            id_empleado: empleado.id_empleado || empleado.id,
            nombre: empleado.nombre,
            usuario: empleado.usuario,
            rol: empleado.rol
        },
        process.env.JWT_SECRET || 'fallback_secret',
        {
            expiresIn: '8h'
        }
    );
}

function verificarToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            error: 'Token no proporcionado'
        });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            error: 'Token inválido'
        });
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'fallback_secret'
        );

        req.empleado = {
            id: decoded.id || decoded.id_empleado,
            id_empleado: decoded.id_empleado || decoded.id,
            nombre: decoded.nombre,
            usuario: decoded.usuario,
            rol: decoded.rol
        };

        next();

    } catch (error) {
        return res.status(401).json({
            error: 'Sesión vencida o token inválido'
        });
    }
}

function autorizarRoles(...rolesPermitidos) {
    return (req, res, next) => {
        const rol = req.empleado?.rol;

        if (!rol) {
            return res.status(403).json({
                error: 'No se pudo verificar el rol del usuario'
            });
        }

        if (!rolesPermitidos.includes(rol)) {
            return res.status(403).json({
                error: 'No tiene permisos para realizar esta acción'
            });
        }

        next();
    };
}

module.exports = {
    generarToken,
    verificarToken,
    autorizarRoles
};