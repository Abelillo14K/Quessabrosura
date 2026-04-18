const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// rutas
const empleadosRoutes = require('./routes/empleados');
app.use('/empleados', empleadosRoutes);

const comprasRoutes = require('./routes/compras');
app.use('/compras', comprasRoutes);

// servir frontend
app.use(express.static('public'));

app.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});