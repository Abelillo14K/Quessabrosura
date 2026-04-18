const express = require('express');
const router = express.Router();
const controller = require('../controllers/compraController');

router.get('/', controller.obtenerCompras);
router.post('/', controller.crearCompra);

module.exports = router;