const express = require('express');
const router = express.Router();
const controller = require('../controllers/gastoController');
const { verificarToken } = require('../middleware/auth');

router.use(verificarToken);

router.get('/', controller.obtenerGastos);
router.get('/fechas', controller.obtenerGastosPorFecha);
router.get('/total', controller.obtenerTotalGastos);
router.get('/resumen', controller.obtenerResumen);
router.post('/', controller.crearGasto);
router.delete('/:id', controller.anularGasto);

module.exports = router;
