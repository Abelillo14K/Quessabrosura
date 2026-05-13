const express = require('express');
const router = express.Router();
const controller = require('../controllers/ventaController');
const { verificarToken } = require('../middleware/auth');

router.use(verificarToken);

router.get('/', controller.obtenerVentas);
router.get('/fechas', controller.obtenerVentasPorFecha);
router.get('/:id/detalle', controller.obtenerDetalleVenta);
router.post('/', controller.crearVenta);
router.delete('/:id', controller.anularVenta);

module.exports = router;
