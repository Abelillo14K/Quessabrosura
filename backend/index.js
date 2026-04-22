const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./db');

// Encontrar la ruta correcta del frontend
let frontendPath = path.join(__dirname, '../frontend');
if (!fs.existsSync(frontendPath)) {
    frontendPath = path.join(__dirname, '../../frontend');
}
if (!fs.existsSync(frontendPath)) {
    frontendPath = path.join(process.cwd(), 'frontend');
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// RUTAS API - primero para evitar conflictos
const empleadosRoutes = require('./routes/empleados');
app.use('/api/empleados', empleadosRoutes);

const comprasRoutes = require('./routes/compras');
app.use('/api/compras', comprasRoutes);

const ventasRoutes = require('./routes/ventas');
app.use('/api/ventas', ventasRoutes);

const productosRoutes = require('./routes/productos');
app.use('/api/productos', productosRoutes);

const gastosRoutes = require('./routes/gastos');
app.use('/api/gastos', gastosRoutes);

const cortesRoutes = require('./routes/cortes');
app.use('/api/cortes', cortesRoutes);

// LOGIN (simple, sin seguridad)
app.post('/api/login', async (req, res) => {
    const { usuario, password } = req.body;

    try {
        const [rows] = await db.query(
            'SELECT * FROM empleado WHERE nombre = ?',
            [usuario]
        );

        if (rows.length === 0) {
            return res.json({ success: false, error: 'Usuario no encontrado' });
        }

        res.json({ success: true, empleado: rows[0] });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// SERVIR FRONTEND - al final
app.use(express.static(frontendPath));

// Redirigir / a login
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'login/login.html'));
});

app.listen(PORT, () => {
    console.log(`Frontend: ${frontendPath}`);
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});