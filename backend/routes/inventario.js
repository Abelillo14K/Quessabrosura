const express = require('express');
const router = express.Router();
const controller = require('../controllers/inventarioController');

router.get('/', controller.obtenerInventario);
router.get('/:id', controller.obtenerProductoInventario);
router.post('/', controller.crearInventario);
router.put('/:id_producto', controller.ajustarInventario);

module.exports = router;