let empleados = [];

const tabla = document.getElementById('tabla');
const btnAgregar = document.getElementById('btnAgregar');
const btnGuardar = document.getElementById('btnGuardar');

function getRoleClass(rol) {
    const rolNormalizado = String(rol || '').toLowerCase();

    const roleMap = {
        'cocinero': 'cocinero',
        'mesero': 'mesero',
        'cajero': 'cajero',
        'administrador': 'administrador',
        'admin': 'administrador'
    };

    return roleMap[rolNormalizado] || '';
}

async function cargarEmpleados() {
    try {
        empleados = await apiFetch('/api/empleados');
        renderizarTabla(empleados);
    } catch (err) {
        tabla.innerHTML = `
            <tr class="empty-row">
                <td colspan="5">No se pudieron cargar los empleados</td>
            </tr>
        `;
        mostrarError(err.message);
    }
}

function renderizarTabla(data) {
    tabla.innerHTML = '';

    if (!data || data.length === 0) {
        tabla.innerHTML = `
            <tr class="empty-row">
                <td colspan="5">No hay empleados registrados</td>
            </tr>
        `;
        return;
    }

    data.forEach(emp => {
        tabla.innerHTML += `
            <tr>
                <td>${emp.id_empleado}</td>
                <td><strong>${emp.nombre}</strong></td>
                <td>${emp.usuario || '—'}</td>
                <td>
                    <span class="role-badge ${getRoleClass(emp.rol)}">
                        ${emp.rol || 'Sin rol'}
                    </span>
                </td>
                <td>
                    <button class="btn-edit" onclick="abrirModal(${emp.id_empleado})">
                        Editar
                    </button>
                    <button class="btn-delete" onclick="eliminar(${emp.id_empleado})">
                        Eliminar
                    </button>
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

    if (password.length < 4) {
        mostrarError('La contraseña debe tener al menos 4 caracteres');
        return;
    }

    try {
        btnAgregar.disabled = true;
        btnAgregar.textContent = 'Guardando...';

        await apiFetch('/api/empleados', {
            method: 'POST',
            body: {
                nombre,
                usuario,
                password,
                rol
            }
        });

        document.getElementById('empleadoForm').reset();

        await cargarEmpleados();

        mostrarExito('Empleado agregado exitosamente');

    } catch (err) {
        mostrarError(err.message);
    } finally {
        btnAgregar.disabled = false;
        btnAgregar.textContent = 'Agregar';
    }
}

function abrirModal(id) {
    const empleado = empleados.find(e => Number(e.id_empleado) === Number(id));

    if (!empleado) {
        mostrarError('Empleado no encontrado');
        return;
    }

    document.getElementById('editId').value = empleado.id_empleado;
    document.getElementById('editNombre').value = empleado.nombre || '';
    document.getElementById('editUsuario').value = empleado.usuario || '';
    document.getElementById('editPassword').value = '';
    document.getElementById('editRol').value = empleado.rol || '';

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

    const body = {
        nombre,
        usuario,
        rol
    };

    if (password && password.trim()) {
        if (password.length < 4) {
            mostrarError('La nueva contraseña debe tener al menos 4 caracteres');
            return;
        }

        body.password = password;
    }

    try {
        btnGuardar.disabled = true;
        btnGuardar.textContent = 'Guardando...';

        await apiFetch(`/api/empleados/${id}`, {
            method: 'PUT',
            body
        });

        cerrarModal();
        await cargarEmpleados();

        mostrarExito('Empleado actualizado exitosamente');

    } catch (err) {
        mostrarError(err.message);
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar';
    }
}

async function eliminar(id) {
    const empleadoSesion = getEmpleadoSesion();

    if (empleadoSesion && Number(empleadoSesion.id_empleado) === Number(id)) {
        mostrarError('No puedes eliminar tu propio usuario mientras tienes sesión iniciada');
        return;
    }

    if (!confirm('¿Está seguro de eliminar este empleado?')) {
        return;
    }

    try {
        await apiFetch(`/api/empleados/${id}`, {
            method: 'DELETE'
        });

        await cargarEmpleados();

        mostrarExito('Empleado eliminado');

    } catch (err) {
        mostrarError(err.message);
    }
}

function buscarEmpleado() {
    const busqueda = document.getElementById('busqueda').value.trim().toLowerCase();

    const filtrados = empleados.filter(emp => {
        return String(emp.nombre || '').toLowerCase().includes(busqueda) ||
               String(emp.usuario || '').toLowerCase().includes(busqueda) ||
               String(emp.rol || '').toLowerCase().includes(busqueda);
    });

    renderizarTabla(filtrados);
}

document.addEventListener('DOMContentLoaded', () => {
    const empleado = verificarSesion();

    if (!empleado) {
        return;
    }

    cargarEmpleados();

    btnAgregar.addEventListener('click', crearEmpleado);
    btnGuardar.addEventListener('click', actualizarEmpleado);
});