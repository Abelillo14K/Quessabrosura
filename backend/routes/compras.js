const express = require('express');
const router = express.Router();

const controller = require('../controllers/compraController');
const { verificarToken, autorizarRoles } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(verificarToken);
router.use(autorizarRoles('Administrador', 'Inventario'));

router.get('/', asyncHandler(controller.obtenerCompras));
router.get('/:id/detalle', asyncHandler(controller.obtenerDetalleCompra));
router.post('/', asyncHandler(controller.crearCompra));
router.delete('/:id', asyncHandler(controller.anularCompra));

module.exports = router;