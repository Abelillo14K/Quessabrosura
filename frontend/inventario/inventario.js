let filtroActual = '';
let inventario = [];
const tabla = document.getElementById('tabla');

function getStockClass(stock, stock_minimo) {
    if (stock <= 0) return 'stock-agotado';
    if (stock_minimo && stock < stock_minimo) return 'stock-bajo';
    return 'stock-normal';
}

function getStockTexto(stock, stock_minimo) {
    if (stock <= 0) return 'Agotado';
    if (stock_minimo && stock < stock_minimo) return 'Stock Bajo';
    return 'Normal';
}

async function cargarProductos() {
    try {
        const data = await apiFetch('/api/productos');
        const select = document.getElementById('producto');
        select.innerHTML = '<option value="">Seleccionar producto...</option>';
        data.forEach(p => {
            select.innerHTML += `<option value="${p.id_producto}">${p.nombre}</option>`;
        });
    } catch (err) {
        console.error('Error:', err);
    }
}

async function cargarInventario() {
    try {
        inventario = await apiFetch('/api/inventario');
        aplicarFiltro();
    } catch (err) {
        mostrarError(err.message);
    }
}

function renderizarTabla(data) {
    tabla.innerHTML = '';

    if (data.length === 0) {
        tabla.innerHTML = '<tr><td colspan="8" class="empty-row">No hay productos en inventario</td></tr>';
        return;
    }

    data.forEach(p => {
        const stock = p.stock || 0;
        const stockMinimo = p.stock_minimo || 0;

        tabla.innerHTML += `
            <tr>
                <td>${p.id_producto}</td>
                <td><strong>${p.nombre}</strong></td>
                <td>${p.tipo}</td>
                <td>${formatearMoneda(p.precio_venta)}</td>
                <td><span class="stock-badge ${getStockClass(stock, stockMinimo)}">${stock}</span></td>
                <td>${stockMinimo}</td>
                <td><span class="stock-badge ${getStockClass(stock, stockMinimo)}">${getStockTexto(stock, stockMinimo)}</span></td>
                <td>
                    <button class="btn-edit" onclick="abrirModal(${p.id_producto})">Ajustar</button>
                    <button class="btn-delete" onclick="eliminar(${p.id_producto})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function guardarInventario() {
    const id_producto = parseInt(document.getElementById('producto').value);
    const stock = parseInt(document.getElementById('stock').value);
    const stock_minimo = parseInt(document.getElementById('stock_minimo').value);

    if (!id_producto || isNaN(stock) || isNaN(stock_minimo)) {
        mostrarError('Seleccione producto y complete stock y stock mínimo');
        return;
    }

    try {
        const data = await apiFetch('/api/inventario', {
            method: 'POST',
            body: { id_producto, stock, stock_minimo }
        });
        document.getElementById('producto').value = '';
        document.getElementById('stock').value = '';
        document.getElementById('stock_minimo').value = 5;
        await cargarInventario();
        await cargarProductos();
        mostrarExito(data.mensaje);
    } catch (err) {
        mostrarError(err.message);
    }
}

function abrirModal(id) {
    const producto = inventario.find(p => p.id_producto === id);
    if (!producto) return;

    document.getElementById('editId').value = id;
    document.getElementById('editStock').value = producto.stock || 0;
    document.getElementById('editStockMinimo').value = producto.stock_minimo || 0;

    document.getElementById('modalEditar').style.display = 'block';
}

async function ajustarInventario() {
    const id_producto = document.getElementById('editId').value;
    const stock = parseInt(document.getElementById('editStock').value);
    const stock_minimo = parseInt(document.getElementById('editStockMinimo').value);

    if (isNaN(stock) || isNaN(stock_minimo)) {
        mostrarError('Complete todos los campos');
        return;
    }

    try {
        await apiFetch(`/api/inventario/${id_producto}`, {
            method: 'PUT',
            body: { stock, stock_minimo }
        });
        cerrarModal();
        await cargarInventario();
        mostrarExito('Inventario actualizado');
    } catch (err) {
        mostrarError(err.message);
    }
}

async function eliminar(id) {
    if (!confirm('¿Está seguro de eliminar este producto del inventario?')) return;

    try {
        await apiFetch(`/api/inventario/${id}`, { method: 'DELETE' });
        await cargarInventario();
        mostrarExito('Producto eliminado del inventario');
    } catch (err) {
        mostrarError(err.message);
    }
}

function buscarInventario() {
    filtroActual = document.getElementById('busqueda').value.toLowerCase();
    aplicarFiltro();
}

function aplicarFiltro() {
    if (!filtroActual) {
        renderizarTabla(inventario);
        return;
    }

    const filtrados = inventario.filter(p =>
        p.nombre.toLowerCase().includes(filtroActual) ||
        p.tipo.toLowerCase().includes(filtroActual)
    );

    renderizarTabla(filtrados);
}

document.addEventListener('DOMContentLoaded', () => {
    verificarSesion();
    cargarProductos();
    cargarInventario();

    document.getElementById('btnGuardar').addEventListener('click', guardarInventario);
    document.getElementById('btnAjustar').addEventListener('click', ajustarInventario);
});
