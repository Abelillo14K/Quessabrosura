const express = require('express');
const router = express.Router();
const controller = require('../controllers/ventaController');
const { verificarToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(verificarToken);

router.get('/', asyncHandler(controller.obtenerVentas));
router.get('/fechas', asyncHandler(controller.obtenerVentasPorFecha));
router.get('/:id/detalle', asyncHandler(controller.obtenerDetalleVenta));
router.post('/', asyncHandler(controller.crearVenta));
router.delete('/:id', asyncHandler(controller.anularVenta));

module.exports = router;