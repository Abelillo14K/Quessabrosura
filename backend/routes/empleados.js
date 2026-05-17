const express = require('express');
const router = express.Router();

const controller = require('../controllers/empleadoController');
const { verificarToken, autorizarRoles } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(verificarToken);
router.use(autorizarRoles('Administrador'));

router.get('/', asyncHandler(controller.obtenerEmpleados));
router.get('/:id', asyncHandler(controller.obtenerEmpleado));
router.post('/', asyncHandler(controller.crearEmpleado));
router.put('/:id', asyncHandler(controller.actualizarEmpleado));
router.patch('/:id/password', asyncHandler(controller.cambiarPassword));
router.delete('/:id', asyncHandler(controller.desactivarEmpleado));

module.exports = router;