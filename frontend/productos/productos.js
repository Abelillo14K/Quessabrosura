let productos = [];
let categorias = [];
let filtroActual = '';

const tabla = document.getElementById('tabla');
const btnAgregar = document.getElementById('btnAgregar');
const btnGuardar = document.getElementById('btnGuardar');

async function cargarCategorias() {
    try {
        categorias = await apiFetch('/api/categorias');

        const selectCrear = document.getElementById('id_categoria');
        const selectEditar = document.getElementById('editCategoria');

        selectCrear.innerHTML = '<option value="">Seleccione una categoría</option>';
        selectEditar.innerHTML = '<option value="">Seleccione una categoría</option>';

        categorias.forEach(categoria => {
            if (categoria.activo != 0) {
                const option = `
                    <option value="${categoria.id_categoria}">
                        ${categoria.nombre}
                    </option>
                `;

                selectCrear.innerHTML += option;
                selectEditar.innerHTML += option;
            }
        });

    } catch (err) {
        mostrarError(err.message);
    }
}

async function cargarProductos() {
    try {
        productos = await apiFetch('/api/productos');
        aplicarFiltro();

    } catch (err) {
        tabla.innerHTML = `
            <tr class="empty-row">
                <td colspan="7">No se pudieron cargar los productos</td>
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
                <td colspan="7">No hay productos registrados</td>
            </tr>
        `;
        return;
    }

    data.forEach(producto => {
        const activo = producto.activo == 1;

        tabla.innerHTML += `
            <tr>
                <td>${producto.id_producto}</td>
                <td><strong>${producto.nombre}</strong></td>
                <td>${producto.categoria || '—'}</td>
                <td>${producto.descripcion || '—'}</td>
                <td>${formatearMoneda(producto.precio_venta)}</td>
                <td>
                    <span class="badge ${activo ? 'badge-success' : 'badge-danger'}">
                        ${activo ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td>
                    <button class="btn-edit" onclick="abrirModal(${producto.id_producto})">
                        Editar
                    </button>

                    <button class="btn-toggle" onclick="toggleActivo(${producto.id_producto}, ${producto.activo})">
                        ${activo ? 'Desactivar' : 'Activar'}
                    </button>
                </td>
            </tr>
        `;
    });
}

async function crearProducto() {
    const nombre = document.getElementById('nombre').value.trim();
    const id_categoria = parseInt(document.getElementById('id_categoria').value);
    const descripcion = document.getElementById('descripcion').value.trim();
    const precio_venta = parseFloat(document.getElementById('precio_venta').value);

    if (!nombre) {
        mostrarError('Ingrese el nombre del producto');
        return;
    }

    if (!id_categoria) {
        mostrarError('Seleccione una categoría');
        return;
    }

    if (isNaN(precio_venta) || precio_venta <= 0) {
        mostrarError('Ingrese un precio válido');
        return;
    }

    try {
        btnAgregar.disabled = true;
        btnAgregar.textContent = 'Guardando...';

        await apiFetch('/api/productos', {
            method: 'POST',
            body: {
                id_categoria,
                nombre,
                descripcion,
                precio_venta
            }
        });

        document.getElementById('nombre').value = '';
        document.getElementById('id_categoria').value = '';
        document.getElementById('descripcion').value = '';
        document.getElementById('precio_venta').value = '';

        await cargarProductos();

        mostrarExito('Producto agregado exitosamente');

    } catch (err) {
        mostrarError(err.message);
    } finally {
        btnAgregar.disabled = false;
        btnAgregar.textContent = 'Agregar Producto';
    }
}

function abrirModal(id) {
    const producto = productos.find(p => Number(p.id_producto) === Number(id));

    if (!producto) {
        mostrarError('Producto no encontrado');
        return;
    }

    document.getElementById('editId').value = producto.id_producto;
    document.getElementById('editNombre').value = producto.nombre || '';
    document.getElementById('editCategoria').value = producto.id_categoria || '';
    document.getElementById('editDescripcion').value = producto.descripcion || '';
    document.getElementById('editPrecioVenta').value = producto.precio_venta || 0;
    document.getElementById('editActivo').checked = producto.activo == 1;

    document.getElementById('modalEditar').style.display = 'block';
}

async function actualizarProducto() {
    const id = document.getElementById('editId').value;
    const nombre = document.getElementById('editNombre').value.trim();
    const id_categoria = parseInt(document.getElementById('editCategoria').value);
    const descripcion = document.getElementById('editDescripcion').value.trim();
    const precio_venta = parseFloat(document.getElementById('editPrecioVenta').value);
    const activo = document.getElementById('editActivo').checked ? 1 : 0;

    if (!nombre) {
        mostrarError('Ingrese el nombre del producto');
        return;
    }

    if (!id_categoria) {
        mostrarError('Seleccione una categoría');
        return;
    }

    if (isNaN(precio_venta) || precio_venta <= 0) {
        mostrarError('Ingrese un precio válido');
        return;
    }

    try {
        btnGuardar.disabled = true;
        btnGuardar.textContent = 'Guardando...';

        await apiFetch(`/api/productos/${id}`, {
            method: 'PUT',
            body: {
                id_categoria,
                nombre,
                descripcion,
                precio_venta,
                activo
            }
        });

        cerrarModal();
        await cargarProductos();

        mostrarExito('Producto actualizado exitosamente');

    } catch (err) {
        mostrarError(err.message);
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar';
    }
}

async function toggleActivo(id, activoActual) {
    const nuevoActivo = activoActual == 1 ? 0 : 1;

    try {
        await apiFetch(`/api/productos/${id}/activo`, {
            method: 'PATCH',
            body: {
                activo: nuevoActivo
            }
        });

        await cargarProductos();

        mostrarExito(nuevoActivo == 1 ? 'Producto activado' : 'Producto desactivado');

    } catch (err) {
        mostrarError(err.message);
    }
}

function buscarProducto() {
    filtroActual = document.getElementById('busqueda').value.trim().toLowerCase();
    aplicarFiltro();
}

function aplicarFiltro() {
    if (!filtroActual) {
        renderizarTabla(productos);
        return;
    }

    const filtrados = productos.filter(producto => {
        return String(producto.nombre || '').toLowerCase().includes(filtroActual) ||
               String(producto.categoria || '').toLowerCase().includes(filtroActual) ||
               String(producto.descripcion || '').toLowerCase().includes(filtroActual);
    });

    renderizarTabla(filtrados);
}

document.addEventListener('DOMContentLoaded', async () => {
    const empleado = verificarSesion();

    if (!empleado) {
        return;
    }

    await cargarCategorias();
    await cargarProductos();

    btnAgregar.addEventListener('click', crearProducto);
    btnGuardar.addEventListener('click', actualizarProducto);
});