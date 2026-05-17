const express = require('express');
const router = express.Router();

const controller = require('../controllers/recetaController');
const { verificarToken, autorizarRoles } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(verificarToken);

router.get(
    '/',
    autorizarRoles('Administrador', 'Inventario', 'Cocina'),
    asyncHandler(controller.obtenerTodasLasRecetas)
);

router.get(
    '/:id_producto',
    autorizarRoles('Administrador', 'Inventario', 'Cocina'),
    asyncHandler(controller.obtenerRecetaProducto)
);

router.post(
    '/:id_producto',
    autorizarRoles('Administrador', 'Inventario'),
    asyncHandler(controller.guardarRecetaProducto)
);

router.delete(
    '/:id_receta',
    autorizarRoles('Administrador', 'Inventario'),
    asyncHandler(controller.eliminarDetalleReceta)
);

module.exports = router;