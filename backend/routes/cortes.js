const express = require('express');
const router = express.Router();
const controller = require('../controllers/corteController');
const { verificarToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(verificarToken);

router.get('/', asyncHandler(controller.obtenerCortes));
router.get('/hoy', asyncHandler(controller.obtenerCorteDelDia));
router.get('/resumen', asyncHandler(controller.obtenerResumenDelDia));
router.post('/', asyncHandler(controller.crearCorte));
router.delete('/:id', asyncHandler(controller.anularCorte));

module.exports = router;