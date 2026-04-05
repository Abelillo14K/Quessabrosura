const express = require('express');
const router = express.Router();
const db = require('../db');

// Obtener todas las ventas
router.get('/', (req, res) => {
  db.query('SELECT * FROM venta', (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al obtener ventas' });
    }
    res.json(results);
  });
});

module.exports = router;
