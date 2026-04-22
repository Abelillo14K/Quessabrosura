const express = require('express');
const router = express.Router();
const controller = require('../controllers/gastoController');

router.get('/', controller.obtenerGastos);
router.get('/fechas', controller.obtenerGastosPorFecha);
router.get('/total', controller.obtenerTotalGastos);
router.post('/', controller.crearGasto);
router.delete('/:id', controller.eliminarGasto);

module.exports = router;