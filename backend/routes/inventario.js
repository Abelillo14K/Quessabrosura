const express = require('express');
const router = express.Router();
const controller = require('../controllers/inventarioController');
const { verificarToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(verificarToken);

router.get('/', asyncHandler(controller.obtenerInventario));
router.get('/:id', asyncHandler(controller.obtenerProductoInventario));
router.post('/', asyncHandler(controller.crearInventario));
router.put('/:id_producto', asyncHandler(controller.ajustarInventario));
router.delete('/:id_producto', asyncHandler(controller.eliminarInventario));

module.exports = router;