const express = require('express');
const router = express.Router();
const controller = require('../controllers/productoController');
const { verificarToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(verificarToken);

router.get('/', asyncHandler(controller.obtenerProductos));
router.get('/:id', asyncHandler(controller.obtenerProducto));
router.post('/', asyncHandler(controller.crearProducto));
router.put('/:id', asyncHandler(controller.actualizarProducto));
router.delete('/:id', asyncHandler(controller.eliminarProducto));
router.patch('/:id/activo', asyncHandler(controller.actualizarActivo));

module.exports = router;