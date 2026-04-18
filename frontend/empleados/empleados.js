let empleados = [];
const tabla = document.getElementById('tabla');
const mensaje = document.getElementById('mensaje');

function getRoleClass(rol) {
    const roleMap = {
        'Cocinero': 'cocinero',
        'Cajero': 'cajero',
        'Mesero': 'mesero',
        'Gerente': 'gerente',
        'Auxiliar': 'auxiliar'
    };
    return roleMap[rol] || 'auxiliar';
}

function cargarEmpleados() {
    fetch('http://localhost:3000/empleados')
        .then(res => res.json())
        .then(data => {
            empleados = data;
            renderizarTabla(data);
        });
}

function renderizarTabla(data) {
    tabla.innerHTML = '';

    if (data.length === 0) {
        tabla.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #999; font-style: italic; padding: 30px;">
                    No hay empleados registrados
                </td>
            </tr>
        `;
        return;
    }

    data.forEach(emp => {
        const fecha = emp.fecha_ingreso ? new Date(emp.fecha_ingreso).toLocaleDateString('es-GT') : 'N/A';
        
        tabla.innerHTML += `
            <tr>
                <td>${emp.id_empleado}</td>
                <td><strong>${emp.nombre}</strong></td>
                <td><span class="role-badge ${getRoleClass(emp.rol)}">${emp.rol}</span></td>
                <td>${fecha}</td>
                <td>
                    <button class="btn-delete" onclick="eliminar(${emp.id_empleado})">🗑️ Eliminar</button>
                </td>
            </tr>
        `;
    });
}

function crearEmpleado() {
    const nombre = document.getElementById('nombre').value.trim();
    const rol = document.getElementById('rol').value;

    if (!nombre || !rol) {
        mostrarMensaje('Por favor complete todos los campos', 'error');
        return;
    }

    fetch('http://localhost:3000/empleados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, rol })
    })
    .then(res => {
        if (res.ok) {
            document.getElementById('nombre').value = '';
            document.getElementById('rol').value = '';
            cargarEmpleados();
            mostrarMensaje('Empleado agregado exitosamente', 'exito');
        } else {
            mostrarMensaje('Error al agregar empleado', 'error');
        }
    })
    .catch(err => mostrarMensaje('Error de conexión', 'error'));
}

function eliminar(id) {
    if (!confirm('¿Está seguro de eliminar este empleado?')) return;

    fetch(`http://localhost:3000/empleados/${id}`, {
        method: 'DELETE'
    })
    .then(res => {
        if (res.ok) {
            cargarEmpleados();
            mostrarMensaje('Empleado eliminado', 'exito');
        } else {
            mostrarMensaje('Error al eliminar', 'error');
        }
    })
    .catch(err => mostrarMensaje('Error de conexión', 'error'));
}

function buscarEmpleado() {
    const busqueda = document.getElementById('busqueda').value.toLowerCase();
    
    const filtrados = empleados.filter(emp => 
        emp.nombre.toLowerCase().includes(busqueda) ||
        emp.rol.toLowerCase().includes(busqueda)
    );
    
    renderizarTabla(filtrados);
}

function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = `mensaje ${tipo} show`;
    
    setTimeout(() => {
        mensaje.classList.remove('show');
    }, 3000);
}

cargarEmpleados();