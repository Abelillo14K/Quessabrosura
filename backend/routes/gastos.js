const express = require('express');
const router = express.Router();

const controller = require('../controllers/gastoController');
const { verificarToken, autorizarRoles } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(verificarToken);
router.use(autorizarRoles('Administrador', 'Cajero'));

router.get('/', asyncHandler(controller.obtenerGastos));
router.get('/resumen', asyncHandler(controller.obtenerResumenGastos));
router.post('/', asyncHandler(controller.crearGasto));
router.delete('/:id', asyncHandler(controller.anularGasto));

module.exports = router;