const tabla = document.getElementById('tabla-empleados');

fetch('http://localhost:3000/empleados')
    .then(res => res.json())
    .then(data => {
        data.forEach(emp => {
            const fila = document.createElement('tr');

            fila.innerHTML = `
                <td>${emp.id_empleado}</td>
                <td>${emp.nombre}</td>
                <td>${emp.rol}</td>
            `;

            tabla.appendChild(fila);
        });
    })
    .catch(err => console.error(err));