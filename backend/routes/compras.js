const express = require('express');
const router = express.Router();
const controller = require('../controllers/compraController');
const { verificarToken } = require('../middleware/auth');

router.use(verificarToken);

router.get('/', controller.obtenerCompras);
router.get('/:id/detalle', controller.obtenerDetalleCompra);
router.post('/', controller.crearCompra);
router.delete('/:id', controller.anularCompra);

module.exports = router;
