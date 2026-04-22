const express = require('express');
const router = express.Router();
const controller = require('../controllers/productoController');

router.get('/', controller.obtenerProductos);
router.get('/:id', controller.obtenerProducto);
router.post('/', controller.crearProducto);
router.put('/:id', controller.actualizarProducto);
router.delete('/:id', controller.eliminarProducto);
router.patch('/:id/stock', controller.actualizarStock);

module.exports = router;