require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const db = require('./db');
const { generarToken } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

const frontendPath = (() => {
    const candidates = [
        path.join(__dirname, '../frontend'),
        path.join(__dirname, '../../frontend'),
        path.join(process.cwd(), 'frontend')
    ];

    for (const p of candidates) {
        if (fs.existsSync(p)) {
            return p;
        }
    }

    return candidates[0];
})();

app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { error: 'Demasiadas solicitudes, intente de nuevo más tarde' }
});

app.use('/api', limiter);

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Demasiados intentos de inicio de sesión' }
});


// RUTAS BACKEND

const empleadosRoutes = require('./routes/empleados');
const productosRoutes = require('./routes/productos');
const categoriasRoutes = require('./routes/categorias');
const insumosRoutes = require('./routes/insumos');

const comprasRoutes = require('./routes/compras');
const ventasRoutes = require('./routes/ventas');
const gastosRoutes = require('./routes/gastos');
const cortesRoutes = require('./routes/cortes');
const recetasRoutes = require('./routes/recetas');
const proveedoresRoutes = require('./routes/proveedores');


app.use('/api/empleados', empleadosRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/insumos', insumosRoutes);


app.use('/api/compras', comprasRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/gastos', gastosRoutes);
app.use('/api/cortes', cortesRoutes);
app.use('/api/recetas', recetasRoutes);
app.use('/api/proveedores', proveedoresRoutes);

// LOGIN
app.post('/api/login', loginLimiter, async (req, res) => {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
        return res.status(400).json({
            success: false,
            error: 'Usuario y contraseña son requeridos'
        });
    }

    try {
        const [rows] = await db.query(
            `SELECT 
                id_empleado,
                nombre,
                usuario,
                password,
                rol,
                activo
             FROM empleado
             WHERE usuario = ?`,
            [usuario]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Usuario o contraseña incorrectos'
            });
        }

        const empleado = rows[0];

        if (empleado.activo == 0) {
            return res.status(403).json({
                success: false,
                error: 'El usuario está inactivo'
            });
        }

        let passwordValida = false;

        const passwordGuardada = empleado.password || '';

        const esHash =
            passwordGuardada.startsWith('$2a$') ||
            passwordGuardada.startsWith('$2b$') ||
            passwordGuardada.startsWith('$2y$');

        if (esHash) {
            passwordValida = await bcrypt.compare(password, passwordGuardada);
        } else {
            passwordValida = password === passwordGuardada;

            if (passwordValida) {
                const hash = await bcrypt.hash(password, 10);

                await db.query(
                    'UPDATE empleado SET password = ? WHERE id_empleado = ?',
                    [hash, empleado.id_empleado]
                );
            }
        }

        if (!passwordValida) {
            return res.status(401).json({
                success: false,
                error: 'Usuario o contraseña incorrectos'
            });
        }

        const token = generarToken(empleado);

        res.json({
            success: true,
            empleado: {
                id_empleado: empleado.id_empleado,
                nombre: empleado.nombre,
                usuario: empleado.usuario,
                rol: empleado.rol
            },
            token
        });

    } catch (error) {
        console.error('Error en login:', error);

        res.status(500).json({
            success: false,
            error: 'Error del servidor'
        });
    }
});

// VERIFICAR TOKEN

app.get('/api/verificar', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.json({ valido: false });
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'fallback_secret'
        );

        res.json({
            valido: true,
            empleado: {
                id_empleado: decoded.id,
                nombre: decoded.nombre,
                usuario: decoded.usuario,
                rol: decoded.rol
            }
        });

    } catch (error) {
        res.json({ valido: false });
    }
});


// FRONTEND

app.use(express.static(frontendPath));

app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'login/login.html'));
});


// MANEJO DE ERRORES

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Frontend: ${frontendPath}`);
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Base de datos: ${process.env.DB_NAME}`);
    console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
});