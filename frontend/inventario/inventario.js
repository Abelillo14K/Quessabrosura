let filtroActual = '';
let inventario = [];

const tabla = document.getElementById('tabla');
const btnGuardar = document.getElementById('btnGuardar');
const btnAjustar = document.getElementById('btnAjustar');

function getStockClass(stock, stockMinimo) {
    const stockActual = Number(stock || 0);
    const minimo = Number(stockMinimo || 0);

    if (stockActual <= 0) {
        return 'stock-agotado';
    }

    if (minimo > 0 && stockActual <= minimo) {
        return 'stock-bajo';
    }

    return 'stock-normal';
}

function getStockTexto(stock, stockMinimo) {
    const stockActual = Number(stock || 0);
    const minimo = Number(stockMinimo || 0);

    if (stockActual <= 0) {
        return 'Agotado';
    }

    if (minimo > 0 && stockActual <= minimo) {
        return 'Stock Bajo';
    }

    return 'Normal';
}

async function cargarProductos() {
    try {
        const data = await apiFetch('/api/productos');
        const select = document.getElementById('producto');

        select.innerHTML = '<option value="">Seleccionar producto...</option>';

        data.forEach(producto => {
            if (producto.activo != 0) {
                select.innerHTML += `
                    <option value="${producto.id_producto}">
                        ${producto.nombre}
                    </option>
                `;
            }
        });

    } catch (err) {
        mostrarError(err.message);
    }
}

async function cargarInventario() {
    try {
        inventario = await apiFetch('/api/inventario');
        aplicarFiltro();

    } catch (err) {
        tabla.innerHTML = `
            <tr class="empty-row">
                <td colspan="8">No se pudo cargar el inventario</td>
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
                <td colspan="8">No hay productos en inventario</td>
            </tr>
        `;
        return;
    }

    data.forEach(producto => {
        const stock = Number(producto.stock || 0);
        const stockMinimo = Number(producto.stock_minimo || 0);
        const claseStock = getStockClass(stock, stockMinimo);

        tabla.innerHTML += `
            <tr>
                <td>${producto.id_producto}</td>
                <td><strong>${producto.nombre}</strong></td>
                <td>${producto.tipo || '—'}</td>
                <td>${formatearMoneda(producto.precio_venta)}</td>
                <td>
                    <span class="stock-badge ${claseStock}">
                        ${stock}
                    </span>
                </td>
                <td>${stockMinimo}</td>
                <td>
                    <span class="stock-badge ${claseStock}">
                        ${getStockTexto(stock, stockMinimo)}
                    </span>
                </td>
                <td>
                    <button class="btn-edit" onclick="abrirModal(${producto.id_producto})">
                        Ajustar
                    </button>
                    <button class="btn-delete" onclick="eliminar(${producto.id_producto})">
                        Quitar
                    </button>
                </td>
            </tr>
        `;
    });
}

async function guardarInventario() {
    const idProducto = parseInt(document.getElementById('producto').value);
    const stock = parseInt(document.getElementById('stock').value);
    const stockMinimo = parseInt(document.getElementById('stock_minimo').value);

    if (!idProducto) {
        mostrarError('Seleccione un producto');
        return;
    }

    if (isNaN(stock) || stock < 0) {
        mostrarError('Ingrese un stock válido');
        return;
    }

    if (isNaN(stockMinimo) || stockMinimo < 0) {
        mostrarError('Ingrese un stock mínimo válido');
        return;
    }

    try {
        btnGuardar.disabled = true;
        btnGuardar.textContent = 'Guardando...';

        const data = await apiFetch('/api/inventario', {
            method: 'POST',
            body: {
                id_producto: idProducto,
                stock,
                stock_minimo: stockMinimo
            }
        });

        document.getElementById('producto').value = '';
        document.getElementById('stock').value = '';
        document.getElementById('stock_minimo').value = 5;

        await cargarInventario();
        await cargarProductos();

        mostrarExito(data.mensaje || 'Inventario guardado');

    } catch (err) {
        mostrarError(err.message);
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar Inventario';
    }
}

function abrirModal(id) {
    const producto = inventario.find(p => Number(p.id_producto) === Number(id));

    if (!producto) {
        mostrarError('Producto no encontrado en inventario');
        return;
    }

    document.getElementById('editId').value = id;
    document.getElementById('editStock').value = producto.stock || 0;
    document.getElementById('editStockMinimo').value = producto.stock_minimo || 0;

    document.getElementById('modalEditar').style.display = 'block';
}

async function ajustarInventario() {
    const idProducto = document.getElementById('editId').value;
    const stock = parseInt(document.getElementById('editStock').value);
    const stockMinimo = parseInt(document.getElementById('editStockMinimo').value);

    if (isNaN(stock) || stock < 0) {
        mostrarError('Ingrese un stock válido');
        return;
    }

    if (isNaN(stockMinimo) || stockMinimo < 0) {
        mostrarError('Ingrese un stock mínimo válido');
        return;
    }

    try {
        btnAjustar.disabled = true;
        btnAjustar.textContent = 'Guardando...';

        await apiFetch(`/api/inventario/${idProducto}`, {
            method: 'PUT',
            body: {
                stock,
                stock_minimo: stockMinimo
            }
        });

        cerrarModal();

        await cargarInventario();

        mostrarExito('Inventario actualizado');

    } catch (err) {
        mostrarError(err.message);
    } finally {
        btnAjustar.disabled = false;
        btnAjustar.textContent = 'Guardar';
    }
}

async function eliminar(id) {
    if (!confirm('¿Está seguro de quitar este producto del inventario? El producto no se eliminará del catálogo.')) {
        return;
    }

    try {
        await apiFetch(`/api/inventario/${id}`, {
            method: 'DELETE'
        });

        await cargarInventario();

        mostrarExito('Producto quitado del inventario');

    } catch (err) {
        mostrarError(err.message);
    }
}

function buscarInventario() {
    filtroActual = document.getElementById('busqueda').value.trim().toLowerCase();
    aplicarFiltro();
}

function aplicarFiltro() {
    if (!filtroActual) {
        renderizarTabla(inventario);
        return;
    }

    const filtrados = inventario.filter(producto => {
        return String(producto.nombre || '').toLowerCase().includes(filtroActual) ||
               String(producto.tipo || '').toLowerCase().includes(filtroActual);
    });

    renderizarTabla(filtrados);
}

document.addEventListener('DOMContentLoaded', () => {
    const empleado = verificarSesion();

    if (!empleado) {
        return;
    }

    cargarProductos();
    cargarInventario();

    btnGuardar.addEventListener('click', guardarInventario);
    btnAjustar.addEventListener('click', ajustarInventario);
});