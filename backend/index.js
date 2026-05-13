require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const bcrypt = require('bcryptjs');
const { generarToken } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

const frontendPath = (() => {
    const candidates = [
        path.join(__dirname, '../frontend'),
        path.join(__dirname, '../../frontend'),
        path.join(process.cwd(), 'frontend')
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    return candidates[0];
})();

const app = express();
const PORT = process.env.PORT || 3000;

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

const empleadosRoutes = require('./routes/empleados');
const comprasRoutes = require('./routes/compras');
const ventasRoutes = require('./routes/ventas');
const productosRoutes = require('./routes/productos');
const gastosRoutes = require('./routes/gastos');
const cortesRoutes = require('./routes/cortes');
const inventarioRoutes = require('./routes/inventario');

app.use('/api/empleados', empleadosRoutes);
app.use('/api/compras', comprasRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/gastos', gastosRoutes);
app.use('/api/cortes', cortesRoutes);
app.use('/api/inventario', inventarioRoutes);

app.post('/api/login', loginLimiter, async (req, res) => {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
        return res.status(400).json({ success: false, error: 'Usuario y contraseña son requeridos' });
    }

    try {
        const [rows] = await db.query(
            'SELECT id_empleado, nombre, usuario, password, rol FROM empleado WHERE usuario = ?',
            [usuario]
        );

        if (rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos' });
        }

        const empleado = rows[0];
        let passwordValida = false;

        if (empleado.password && (empleado.password.startsWith('$2a$') || empleado.password.startsWith('$2b$') || empleado.password.startsWith('$2y$'))) {
            passwordValida = await bcrypt.compare(password, empleado.password);
        } else {
            passwordValida = (password === empleado.password);
            if (passwordValida) {
                const hash = await bcrypt.hash(password, 10);
                await db.query('UPDATE empleado SET password = ? WHERE id_empleado = ?', [hash, empleado.id_empleado]);
            }
        }

        if (!passwordValida) {
            return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos' });
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
        res.status(500).json({ success: false, error: 'Error del servidor' });
    }
});

app.use(express.static(frontendPath));

app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'login/login.html'));
});

app.get('/api/verificar', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.json({ valido: false });
    }

    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        res.json({ valido: true, empleado: { id_empleado: decoded.id, nombre: decoded.nombre, usuario: decoded.usuario, rol: decoded.rol } });
    } catch {
        res.json({ valido: false });
    }
});

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Frontend: ${frontendPath}`);
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
});
