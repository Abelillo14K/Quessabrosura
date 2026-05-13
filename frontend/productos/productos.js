let productos = [];
let filtroActual = '';
const tabla = document.getElementById('tabla');

async function cargarProductos() {
    try {
        productos = await apiFetch('/api/productos');
        aplicarFiltro();
    } catch (err) {
        mostrarError(err.message);
    }
}

function renderizarTabla(data) {
    tabla.innerHTML = '';

    if (data.length === 0) {
        tabla.innerHTML = '<tr><td colspan="6" class="empty-row">No hay productos registrados</td></tr>';
        return;
    }

    data.forEach(p => {
        const activo = p.activo == 1;
        tabla.innerHTML += `
            <tr>
                <td>${p.id_producto}</td>
                <td><strong>${p.nombre}</strong></td>
                <td>${p.tipo}</td>
                <td>${formatearMoneda(p.precio_venta)}</td>
                <td><span class="badge ${activo ? 'badge-success' : 'badge-danger'}">${activo ? 'Activo' : 'Inactivo'}</span></td>
                <td>
                    <button class="btn-edit" onclick="abrirModal(${p.id_producto})">Editar</button>
                    <button class="btn-toggle" onclick="toggleActivo(${p.id_producto}, ${p.activo})">${activo ? 'Desactivar' : 'Activar'}</button>
                    <button class="btn-delete" onclick="eliminar(${p.id_producto})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function crearProducto() {
    const nombre = document.getElementById('nombre').value.trim();
    const tipo = document.getElementById('tipo').value;
    const precio_venta = parseFloat(document.getElementById('precio_venta').value);

    if (!nombre || !tipo || isNaN(precio_venta) || precio_venta <= 0) {
        mostrarError('Por favor complete todos los campos correctamente');
        return;
    }

    try {
        await apiFetch('/api/productos', {
            method: 'POST',
            body: { nombre, tipo, precio_venta, activo: 1 }
        });
        document.getElementById('nombre').value = '';
        document.getElementById('tipo').value = '';
        document.getElementById('precio_venta').value = '';
        await cargarProductos();
        mostrarExito('Producto agregado exitosamente');
    } catch (err) {
        mostrarError(err.message);
    }
}

function abrirModal(id) {
    const producto = productos.find(p => p.id_producto === id);
    if (!producto) return;

    document.getElementById('editId').value = producto.id_producto;
    document.getElementById('editNombre').value = producto.nombre;
    document.getElementById('editTipo').value = producto.tipo;
    document.getElementById('editPrecioVenta').value = producto.precio_venta;
    document.getElementById('editActivo').checked = producto.activo == 1;

    document.getElementById('modalEditar').style.display = 'block';
}

async function actualizarProducto() {
    const id = document.getElementById('editId').value;
    const nombre = document.getElementById('editNombre').value.trim();
    const tipo = document.getElementById('editTipo').value;
    const precio_venta = parseFloat(document.getElementById('editPrecioVenta').value);
    const activo = document.getElementById('editActivo').checked ? 1 : 0;

    if (!nombre || !tipo || isNaN(precio_venta) || precio_venta <= 0) {
        mostrarError('Por favor complete todos los campos correctamente');
        return;
    }

    try {
        await apiFetch(`/api/productos/${id}`, {
            method: 'PUT',
            body: { nombre, tipo, precio_venta, activo }
        });
        cerrarModal();
        await cargarProductos();
        mostrarExito('Producto actualizado exitosamente');
    } catch (err) {
        mostrarError(err.message);
    }
}

async function toggleActivo(id, activoActual) {
    const nuevoActivo = activoActual == 1 ? 0 : 1;

    try {
        await apiFetch(`/api/productos/${id}/activo`, {
            method: 'PATCH',
            body: { activo: nuevoActivo }
        });
        await cargarProductos();
        mostrarExito(nuevoActivo == 1 ? 'Producto activado' : 'Producto desactivado');
    } catch (err) {
        mostrarError(err.message);
    }
}

async function eliminar(id) {
    if (!confirm('¿Está seguro de eliminar este producto?')) return;

    try {
        await apiFetch(`/api/productos/${id}`, { method: 'DELETE' });
        await cargarProductos();
        mostrarExito('Producto eliminado');
    } catch (err) {
        mostrarError(err.message);
    }
}

function buscarProducto() {
    filtroActual = document.getElementById('busqueda').value.toLowerCase();
    aplicarFiltro();
}

function aplicarFiltro() {
    if (!filtroActual) {
        renderizarTabla(productos);
        return;
    }

    const filtrados = productos.filter(p =>
        p.nombre.toLowerCase().includes(filtroActual) ||
        p.tipo.toLowerCase().includes(filtroActual)
    );

    renderizarTabla(filtrados);
}

document.addEventListener('DOMContentLoaded', () => {
    verificarSesion();
    cargarProductos();

    document.getElementById('btnAgregar').addEventListener('click', crearProducto);
    document.getElementById('btnGuardar').addEventListener('click', actualizarProducto);
});
