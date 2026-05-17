const express = require('express');
const router = express.Router();

const controller = require('../controllers/insumoController');
const { verificarToken, autorizarRoles } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(verificarToken);

router.get(
    '/',
    autorizarRoles('Administrador', 'Inventario', 'Cocina'),
    asyncHandler(controller.obtenerInsumos)
);

router.get(
    '/movimientos',
    autorizarRoles('Administrador', 'Inventario'),
    asyncHandler(controller.obtenerMovimientos)
);

router.get(
    '/:id',
    autorizarRoles('Administrador', 'Inventario', 'Cocina'),
    asyncHandler(controller.obtenerInsumo)
);

router.post(
    '/',
    autorizarRoles('Administrador', 'Inventario'),
    asyncHandler(controller.crearInsumo)
);

router.put(
    '/:id',
    autorizarRoles('Administrador', 'Inventario'),
    asyncHandler(controller.actualizarInsumo)
);

router.patch(
    '/:id/stock',
    autorizarRoles('Administrador', 'Inventario'),
    asyncHandler(controller.ajustarStock)
);

router.delete(
    '/:id',
    autorizarRoles('Administrador', 'Inventario'),
    asyncHandler(controller.desactivarInsumo)
);

module.exports = router;