let empleados = [];
const tabla = document.getElementById('tabla');

function getRoleClass(rol) {
    const roleMap = {
        'Cocinero': 'cocinero',
        'Mesero': 'mesero',
        'Cajero': 'cajero',
        'Administrador': 'administrador'
    };
    return roleMap[rol] || '';
}

async function cargarEmpleados() {
    try {
        empleados = await apiFetch('/api/empleados');
        renderizarTabla(empleados);
    } catch (err) {
        mostrarError(err.message);
    }
}

function renderizarTabla(data) {
    tabla.innerHTML = '';

    if (data.length === 0) {
        tabla.innerHTML = '<tr><td colspan="6" class="empty-row">No hay empleados registrados</td></tr>';
        return;
    }

    data.forEach(emp => {
        const fecha = emp.fecha_ingreso ? formatearFecha(emp.fecha_ingreso) : 'N/A';
        tabla.innerHTML += `
            <tr>
                <td>${emp.id_empleado}</td>
                <td><strong>${emp.nombre}</strong></td>
                <td>${emp.usuario}</td>
                <td><span class="role-badge ${getRoleClass(emp.rol)}">${emp.rol}</span></td>
                <td>${fecha}</td>
                <td>
                    <button class="btn-edit" onclick="abrirModal(${emp.id_empleado})">Editar</button>
                    <button class="btn-delete" onclick="eliminar(${emp.id_empleado})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function crearEmpleado() {
    const nombre = document.getElementById('nombre').value.trim();
    const usuario = document.getElementById('usuario').value.trim();
    const password = document.getElementById('password').value;
    const rol = document.getElementById('rol').value;

    if (!nombre || !usuario || !password || !rol) {
        mostrarError('Por favor complete todos los campos');
        return;
    }

    try {
        const data = await apiFetch('/api/empleados', {
            method: 'POST',
            body: { nombre, usuario, password, rol }
        });
        document.getElementById('empleadoForm').reset();
        await cargarEmpleados();
        mostrarExito('Empleado agregado exitosamente');
    } catch (err) {
        mostrarError(err.message);
    }
}

function abrirModal(id) {
    const empleado = empleados.find(e => e.id_empleado === id);
    if (!empleado) return;

    document.getElementById('editId').value = empleado.id_empleado;
    document.getElementById('editNombre').value = empleado.nombre;
    document.getElementById('editUsuario').value = empleado.usuario;
    document.getElementById('editPassword').value = '';
    document.getElementById('editRol').value = empleado.rol;

    document.getElementById('modalEditar').style.display = 'block';
}

async function actualizarEmpleado() {
    const id = document.getElementById('editId').value;
    const nombre = document.getElementById('editNombre').value.trim();
    const usuario = document.getElementById('editUsuario').value.trim();
    const password = document.getElementById('editPassword').value;
    const rol = document.getElementById('editRol').value;

    if (!nombre || !usuario || !rol) {
        mostrarError('Por favor complete nombre, usuario y rol');
        return;
    }

    const body = { nombre, usuario, rol };
    if (password) body.password = password;

    try {
        await apiFetch(`/api/empleados/${id}`, {
            method: 'PUT',
            body
        });
        cerrarModal();
        await cargarEmpleados();
        mostrarExito('Empleado actualizado exitosamente');
    } catch (err) {
        mostrarError(err.message);
    }
}

async function eliminar(id) {
    if (!confirm('¿Está seguro de eliminar este empleado?')) return;

    try {
        await apiFetch(`/api/empleados/${id}`, { method: 'DELETE' });
        await cargarEmpleados();
        mostrarExito('Empleado eliminado');
    } catch (err) {
        mostrarError(err.message);
    }
}

function buscarEmpleado() {
    const busqueda = document.getElementById('busqueda').value.toLowerCase();
    const filtrados = empleados.filter(emp =>
        emp.nombre.toLowerCase().includes(busqueda) ||
        emp.usuario.toLowerCase().includes(busqueda) ||
        emp.rol.toLowerCase().includes(busqueda)
    );
    renderizarTabla(filtrados);
}

document.addEventListener('DOMContentLoaded', () => {
    verificarSesion();
    cargarEmpleados();

    document.getElementById('btnAgregar').addEventListener('click', crearEmpleado);
    document.getElementById('btnGuardar').addEventListener('click', actualizarEmpleado);
});
