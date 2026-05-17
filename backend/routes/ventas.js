const express = require('express');
const router = express.Router();

const controller = require('../controllers/ventaController');
const { verificarToken, autorizarRoles } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(verificarToken);
router.use(autorizarRoles('Administrador', 'Cajero'));

router.get('/', asyncHandler(controller.obtenerVentas));
router.get('/fechas', asyncHandler(controller.obtenerVentasPorFecha));
router.get('/metodos-pago', asyncHandler(controller.obtenerMetodosPago));
router.get('/:id/detalle', asyncHandler(controller.obtenerDetalleVenta));
router.get('/:id/ticket', asyncHandler(controller.obtenerTicketVenta));
router.post('/', asyncHandler(controller.crearVenta));
router.delete('/:id', asyncHandler(controller.anularVenta));

module.exports = router;