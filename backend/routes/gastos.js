const express = require('express');
const router = express.Router();
const controller = require('../controllers/gastoController');
const { verificarToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(verificarToken);

router.get('/', asyncHandler(controller.obtenerGastos));
router.get('/fechas', asyncHandler(controller.obtenerGastosPorFecha));
router.get('/total', asyncHandler(controller.obtenerTotalGastos));
router.get('/resumen', asyncHandler(controller.obtenerResumen));
router.post('/', asyncHandler(controller.crearGasto));
router.delete('/:id', asyncHandler(controller.anularGasto));

module.exports = router;