fetch('http://localhost:3000/ventas')
  .then(res => res.json())
  .then(data => {
    const tabla = document.getElementById('tablaVentas');
    data.forEach(v => {
      const fila = `
        <tr>
          <td>${v.id_venta}</td>
          <td>${v.fecha}</td>
          <td>${v.hora}</td>
          <td>Q${v.total}</td>
          <td>${v.metodo_pago}</td>
          <td>${v.id_empleado}</td>
        </tr>`;
      tabla.innerHTML += fila;
    });
  })
  .catch(err => console.error('Error al cargar ventas:', err));
