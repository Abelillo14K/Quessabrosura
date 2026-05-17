const express = require('express');
const router = express.Router();

const controller = require('../controllers/categoriaController');
const { verificarToken, autorizarRoles } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(verificarToken);

router.get(
    '/',
    autorizarRoles('Administrador', 'Inventario', 'Cajero', 'Cocina'),
    asyncHandler(controller.obtenerCategorias)
);

router.get(
    '/:id',
    autorizarRoles('Administrador', 'Inventario', 'Cajero', 'Cocina'),
    asyncHandler(controller.obtenerCategoria)
);

router.post(
    '/',
    autorizarRoles('Administrador', 'Inventario'),
    asyncHandler(controller.crearCategoria)
);

router.put(
    '/:id',
    autorizarRoles('Administrador', 'Inventario'),
    asyncHandler(controller.actualizarCategoria)
);

router.delete(
    '/:id',
    autorizarRoles('Administrador', 'Inventario'),
    asyncHandler(controller.desactivarCategoria)
);

module.exports = router;