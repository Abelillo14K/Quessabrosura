const express = require('express');
const router = express.Router();
const controller = require('../controllers/ventaController');

router.get('/', controller.obtenerVentas);
router.post('/', controller.crearVenta);
router.get('/fechas', controller.obtenerVentasPorFecha);

module.exports = router;