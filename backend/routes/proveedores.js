const express = require('express');
const router = express.Router();

const controller = require('../controllers/proveedorController');
const { verificarToken, autorizarRoles } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(verificarToken);
router.use(autorizarRoles('Administrador', 'Inventario'));

router.get('/', asyncHandler(controller.obtenerProveedores));
router.get('/:id', asyncHandler(controller.obtenerProveedor));
router.post('/', asyncHandler(controller.crearProveedor));
router.put('/:id', asyncHandler(controller.actualizarProveedor));
router.delete('/:id', asyncHandler(controller.desactivarProveedor));

module.exports = router;