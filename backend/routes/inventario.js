const express = require('express');
const router = express.Router();
const controller = require('../controllers/inventarioController');
const { verificarToken } = require('../middleware/auth');

router.use(verificarToken);

router.get('/', controller.obtenerInventario);
router.get('/:id', controller.obtenerProductoInventario);
router.post('/', controller.crearInventario);
router.put('/:id_producto', controller.ajustarInventario);
router.delete('/:id_producto', controller.eliminarInventario);

module.exports = router;
