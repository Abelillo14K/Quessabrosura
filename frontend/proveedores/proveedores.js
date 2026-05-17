let proveedores = [];
let filtroActual = '';

const tabla = document.getElementById('tabla');
const btnAgregar = document.getElementById('btnAgregar');
const btnGuardar = document.getElementById('btnGuardar');

async function cargarProveedores() {
    try {
        proveedores = await apiFetch('/api/proveedores');
        aplicarFiltro();

    } catch (err) {
        tabla.innerHTML = `
            <tr class="empty-row">
                <td colspan="6">No se pudieron cargar los proveedores</td>
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
                <td colspan="6">No hay proveedores registrados</td>
            </tr>
        `;
        return;
    }

    data.forEach(proveedor => {
        const activo = proveedor.activo == 1;

        tabla.innerHTML += `
            <tr class="${activo ? '' : 'row-inactivo'}">
                <td>${proveedor.id_proveedor}</td>
                <td><strong>${proveedor.nombre}</strong></td>
                <td>${proveedor.telefono || '—'}</td>
                <td>${proveedor.direccion || '—'}</td>
                <td>
                    <span class="badge ${activo ? 'badge-success' : 'badge-danger'}">
                        ${activo ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td>
                    <button class="btn-edit" onclick="abrirModal(${proveedor.id_proveedor})">
                        Editar
                    </button>

                    ${activo ? `
                        <button class="btn-delete" onclick="desactivarProveedor(${proveedor.id_proveedor})">
                            Desactivar
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    });
}

async function crearProveedor() {
    const nombre = document.getElementById('nombre').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const direccion = document.getElementById('direccion').value.trim();

    if (!nombre) {
        mostrarError('Ingrese el nombre del proveedor');
        return;
    }

    try {
        btnAgregar.disabled = true;
        btnAgregar.textContent = 'Guardando...';

        await apiFetch('/api/proveedores', {
            method: 'POST',
            body: {
                nombre,
                telefono,
                direccion
            }
        });

        document.getElementById('nombre').value = '';
        document.getElementById('telefono').value = '';
        document.getElementById('direccion').value = '';

        await cargarProveedores();

        mostrarExito('Proveedor agregado exitosamente');

    } catch (err) {
        mostrarError(err.message);
    } finally {
        btnAgregar.disabled = false;
        btnAgregar.textContent = 'Agregar Proveedor';
    }
}

function abrirModal(id) {
    const proveedor = proveedores.find(p => Number(p.id_proveedor) === Number(id));

    if (!proveedor) {
        mostrarError('Proveedor no encontrado');
        return;
    }

    document.getElementById('editId').value = proveedor.id_proveedor;
    document.getElementById('editNombre').value = proveedor.nombre || '';
    document.getElementById('editTelefono').value = proveedor.telefono || '';
    document.getElementById('editDireccion').value = proveedor.direccion || '';
    document.getElementById('editActivo').checked = proveedor.activo == 1;

    document.getElementById('modalEditar').style.display = 'block';
}

async function actualizarProveedor() {
    const id = document.getElementById('editId').value;
    const nombre = document.getElementById('editNombre').value.trim();
    const telefono = document.getElementById('editTelefono').value.trim();
    const direccion = document.getElementById('editDireccion').value.trim();
    const activo = document.getElementById('editActivo').checked ? 1 : 0;

    if (!nombre) {
        mostrarError('Ingrese el nombre del proveedor');
        return;
    }

    try {
        btnGuardar.disabled = true;
        btnGuardar.textContent = 'Guardando...';

        await apiFetch(`/api/proveedores/${id}`, {
            method: 'PUT',
            body: {
                nombre,
                telefono,
                direccion,
                activo
            }
        });

        cerrarModal();
        await cargarProveedores();

        mostrarExito('Proveedor actualizado exitosamente');

    } catch (err) {
        mostrarError(err.message);
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar';
    }
}

async function desactivarProveedor(id) {
    if (!confirm('¿Desea desactivar este proveedor?')) {
        return;
    }

    try {
        await apiFetch(`/api/proveedores/${id}`, {
            method: 'DELETE'
        });

        await cargarProveedores();

        mostrarExito('Proveedor desactivado');

    } catch (err) {
        mostrarError(err.message);
    }
}

function buscarProveedor() {
    filtroActual = document.getElementById('busqueda').value.trim().toLowerCase();
    aplicarFiltro();
}

function aplicarFiltro() {
    if (!filtroActual) {
        renderizarTabla(proveedores);
        return;
    }

    const filtrados = proveedores.filter(proveedor => {
        return String(proveedor.nombre || '').toLowerCase().includes(filtroActual) ||
               String(proveedor.telefono || '').toLowerCase().includes(filtroActual) ||
               String(proveedor.direccion || '').toLowerCase().includes(filtroActual);
    });

    renderizarTabla(filtrados);
}

document.addEventListener('DOMContentLoaded', () => {
    const empleado = verificarSesion();

    if (!empleado) {
        return;
    }

    cargarProveedores();

    btnAgregar.addEventListener('click', crearProveedor);
    btnGuardar.addEventListener('click', actualizarProveedor);
});