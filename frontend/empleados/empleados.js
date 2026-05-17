let empleados = [];
let filtroActual = '';

const tabla = document.getElementById('tabla');
const btnAgregar = document.getElementById('btnAgregar');
const btnGuardar = document.getElementById('btnGuardar');

async function cargarEmpleados() {
    try {
        empleados = await apiFetch('/api/empleados');
        aplicarFiltro();

    } catch (err) {
        tabla.innerHTML = `
            <tr class="empty-row">
                <td colspan="7">No se pudieron cargar los empleados</td>
            </tr>
        `;
        mostrarError(err.message);
    }
}

function getRolClass(rol) {
    const r = String(rol || '').toLowerCase();

    if (r === 'administrador') {
        return 'rol-admin';
    }

    if (r === 'cajero') {
        return 'rol-cajero';
    }

    if (r === 'inventario') {
        return 'rol-inventario';
    }

    return 'rol-cocina';
}

function renderizarTabla(data) {
    tabla.innerHTML = '';

    if (!data || data.length === 0) {
        tabla.innerHTML = `
            <tr class="empty-row">
                <td colspan="7">No hay empleados registrados</td>
            </tr>
        `;
        return;
    }

    data.forEach(empleado => {
        const activo = empleado.activo == 1;

        tabla.innerHTML += `
            <tr class="${activo ? '' : 'row-inactivo'}">
                <td>${empleado.id_empleado}</td>
                <td><strong>${empleado.nombre}</strong></td>
                <td>${empleado.usuario}</td>
                <td>
                    <span class="rol-badge ${getRolClass(empleado.rol)}">
                        ${empleado.rol}
                    </span>
                </td>
                <td>
                    <span class="badge ${activo ? 'badge-success' : 'badge-danger'}">
                        ${activo ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td>${formatearFecha(empleado.fecha_creacion)}</td>
                <td>
                    <button class="btn-edit" onclick="abrirModal(${empleado.id_empleado})">
                        Editar
                    </button>

                    ${activo ? `
                        <button class="btn-delete" onclick="desactivarEmpleado(${empleado.id_empleado})">
                            Desactivar
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    });
}

async function crearEmpleado() {
    const nombre = document.getElementById('nombre').value.trim();
    const usuario = document.getElementById('usuario').value.trim();
    const password = document.getElementById('password').value.trim();
    const rol = document.getElementById('rol').value;

    if (!nombre) {
        mostrarError('Ingrese el nombre del empleado');
        return;
    }

    if (!usuario) {
        mostrarError('Ingrese el usuario');
        return;
    }

    if (!password) {
        mostrarError('Ingrese una contraseña inicial');
        return;
    }

    if (!rol) {
        mostrarError('Seleccione un rol');
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

        document.getElementById('nombre').value = '';
        document.getElementById('usuario').value = '';
        document.getElementById('password').value = '';
        document.getElementById('rol').value = '';

        await cargarEmpleados();

        mostrarExito('Empleado agregado exitosamente');

    } catch (err) {
        mostrarError(err.message);
    } finally {
        btnAgregar.disabled = false;
        btnAgregar.textContent = 'Agregar Empleado';
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
    document.getElementById('editRol').value = empleado.rol || 'Cajero';
    document.getElementById('editActivo').checked = empleado.activo == 1;
    document.getElementById('editPassword').value = '';

    document.getElementById('modalEditar').style.display = 'block';
}

async function actualizarEmpleado() {
    const id = document.getElementById('editId').value;
    const nombre = document.getElementById('editNombre').value.trim();
    const usuario = document.getElementById('editUsuario').value.trim();
    const rol = document.getElementById('editRol').value;
    const activo = document.getElementById('editActivo').checked ? 1 : 0;
    const password = document.getElementById('editPassword').value.trim();

    if (!nombre) {
        mostrarError('Ingrese el nombre del empleado');
        return;
    }

    if (!usuario) {
        mostrarError('Ingrese el usuario');
        return;
    }

    if (!rol) {
        mostrarError('Seleccione un rol');
        return;
    }

    try {
        btnGuardar.disabled = true;
        btnGuardar.textContent = 'Guardando...';

        await apiFetch(`/api/empleados/${id}`, {
            method: 'PUT',
            body: {
                nombre,
                usuario,
                rol,
                activo
            }
        });

        if (password) {
            await apiFetch(`/api/empleados/${id}/password`, {
                method: 'PATCH',
                body: {
                    password
                }
            });
        }

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

async function desactivarEmpleado(id) {
    if (!confirm('¿Desea desactivar este empleado?')) {
        return;
    }

    try {
        await apiFetch(`/api/empleados/${id}`, {
            method: 'DELETE'
        });

        await cargarEmpleados();

        mostrarExito('Empleado desactivado');

    } catch (err) {
        mostrarError(err.message);
    }
}

function buscarEmpleado() {
    filtroActual = document.getElementById('busqueda').value.trim().toLowerCase();
    aplicarFiltro();
}

function aplicarFiltro() {
    if (!filtroActual) {
        renderizarTabla(empleados);
        return;
    }

    const filtrados = empleados.filter(empleado => {
        return String(empleado.nombre || '').toLowerCase().includes(filtroActual) ||
               String(empleado.usuario || '').toLowerCase().includes(filtroActual) ||
               String(empleado.rol || '').toLowerCase().includes(filtroActual);
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