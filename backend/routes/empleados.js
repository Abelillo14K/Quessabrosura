const express = require('express');
const router = express.Router();
const controller = require('../controllers/empleadoController');

router.get('/', controller.obtenerEmpleados);
router.post('/', controller.crearEmpleado);
router.delete('/:id', controller.eliminarEmpleado);

module.exports = router;