const express = require('express');
const router = express.Router();
const controller = require('../controllers/empleadoController');
const { verificarToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(verificarToken);

router.get('/', asyncHandler(controller.obtenerEmpleados));
router.post('/', asyncHandler(controller.crearEmpleado));
router.put('/:id', asyncHandler(controller.actualizarEmpleado));
router.delete('/:id', asyncHandler(controller.eliminarEmpleado));

module.exports = router;