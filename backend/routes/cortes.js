const express = require('express');
const router = express.Router();
const controller = require('../controllers/corteController');

router.get('/', controller.obtenerCortes);
router.get('/hoy', controller.obtenerCorteDelDia);
router.get('/resumen', controller.obtenerResumenDelDia);
router.post('/', controller.crearCorte);
router.delete('/:id', controller.eliminarCorte);

module.exports = router;