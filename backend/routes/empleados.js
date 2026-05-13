const express = require('express');
const router = express.Router();
const controller = require('../controllers/empleadoController');
const { verificarToken } = require('../middleware/auth');

router.use(verificarToken);

router.get('/', controller.obtenerEmpleados);
router.post('/', controller.crearEmpleado);
router.put('/:id', controller.actualizarEmpleado);
router.delete('/:id', controller.eliminarEmpleado);

module.exports = router;
