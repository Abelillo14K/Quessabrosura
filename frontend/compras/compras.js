let productos = [];
let historialCompleto = [];
let filtroActual = '';

const lista = document.getElementById('lista');
const historial = document.getElementById('historial');
const totalCarrito = document.getElementById('totalCarrito');

async function cargarProductos() {
    try {
        const data = await apiFetch('/api/productos');
        const select = document.getElementById('producto');
        select.innerHTML = '<option value="">Seleccionar producto...</option>';
        data.forEach(p => {
            if (p.activo != 0) {
                select.innerHTML += `<option value="${p.id_producto}">${p.nombre}</option>`;
            }
        });
    } catch (err) {
        mostrarError(err.message);
    }
}

function agregar() {
    const select = document.getElementById('producto');
    const id_producto = parseInt(select.value);
    const nombre = select.options[select.selectedIndex]?.text || 'Desconocido';
    const cantidad = parseInt(document.getElementById('cantidad').value);
    const precio = parseFloat(document.getElementById('precio').value);

    if (!id_producto || !cantidad || cantidad < 1 || !precio || precio <= 0) {
        mostrarError('Complete todos los campos correctamente');
        return;
    }

    productos.push({ id_producto, nombre, cantidad, precio });

    select.value = '';
    document.getElementById('cantidad').value = '';
    document.getElementById('precio').value = '';

    mostrarLista();
    mostrarExito('Producto agregado');
}

function mostrarLista() {
    lista.innerHTML = '';

    if (productos.length === 0) {
        lista.innerHTML = '<tr class="empty-row"><td colspan="5">No hay productos agregados</td></tr>';
        totalCarrito.textContent = 'Q0.00';
        return;
    }

    let total = 0;
    productos.forEach((p, index) => {
        const subtotal = p.cantidad * p.precio;
        total += subtotal;
        lista.innerHTML += `
            <tr>
                <td><strong>${p.nombre}</strong></td>
                <td>${p.cantidad}</td>
                <td>${formatearMoneda(p.precio)}</td>
                <td>${formatearMoneda(subtotal)}</td>
                <td><button class="btn-delete" onclick="eliminarProducto(${index})">Eliminar</button></td>
            </tr>
        `;
    });

    totalCarrito.textContent = formatearMoneda(total);
}

function eliminarProducto(index) {
    productos.splice(index, 1);
    mostrarLista();
}

function limpiarCarrito() {
    if (productos.length === 0) return;
    if (!confirm('¿Limpiar todos los productos del carrito?')) return;
    productos = [];
    mostrarLista();
}

async function guardarCompra() {
    if (productos.length === 0) {
        mostrarError('No hay productos para guardar');
        return;
    }

    try {
        const data = await apiFetch('/api/compras', {
            method: 'POST',
            body: { productos }
        });
        productos = [];
        mostrarLista();
        await cargarHistorial();
        mostrarExito(`Compra #${data.id_compra} registrada exitosamente`);
    } catch (err) {
        mostrarError(err.message);
    }
}

async function cargarHistorial() {
    try {
        historialCompleto = await apiFetch('/api/compras');
        aplicarFiltroHistorial();
    } catch (err) {
        mostrarError(err.message);
    }
}

function buscarHistorial() {
    filtroActual = document.getElementById('busqueda').value.toLowerCase();
    aplicarFiltroHistorial();
}

function aplicarFiltroHistorial() {
    historial.innerHTML = '';

    let data = historialCompleto;

    if (filtroActual) {
        data = data.filter(c => String(c.id_compra).includes(filtroActual));
    }

    if (data.length === 0) {
        historial.innerHTML = '<tr><td colspan="6" class="empty-row">No se encontraron compras</td></tr>';
        return;
    }

    data.forEach(c => {
        historial.innerHTML += `
            <tr>
                <td>#${c.id_compra}</td>
                <td>${formatearFecha(c.fecha)}</td>
                <td>—</td>
                <td>${formatearMoneda(c.total)}</td>
                <td><span class="badge badge-success">Activa</span></td>
                <td>
                    <button class="btn-view" onclick="verDetalle(${c.id_compra})">Ver</button>
                    <button class="btn-delete" onclick="anularCompra(${c.id_compra})">Anular</button>
                </td>
            </tr>
        `;
    });
}

async function verDetalle(id) {
    try {
        const data = await apiFetch(`/api/compras/${id}/detalle`);
        document.getElementById('detalleTitulo').textContent = `Detalle de Compra #${id}`;
        const body = document.getElementById('detalleBody');
        body.innerHTML = '';
        let total = 0;

        data.forEach(d => {
            total += parseFloat(d.subtotal);
            body.innerHTML += `
                <tr>
                    <td><strong>${d.producto}</strong></td>
                    <td>${d.cantidad}</td>
                    <td>${formatearMoneda(d.precio_compra)}</td>
                    <td>${formatearMoneda(d.subtotal)}</td>
                </tr>
            `;
        });

        document.getElementById('detalleTotal').textContent = formatearMoneda(total);
        document.getElementById('modalDetalle').style.display = 'block';
    } catch (err) {
        mostrarError(err.message);
    }
}

async function anularCompra(id) {
    if (!confirm(`¿Está seguro de anular la compra #${id}? Se revertirá el stock.`)) return;

    try {
        await apiFetch(`/api/compras/${id}`, { method: 'DELETE' });
        await cargarHistorial();
        mostrarExito(`Compra #${id} anulada`);
    } catch (err) {
        mostrarError(err.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    verificarSesion();
    cargarProductos();
    cargarHistorial();

    document.getElementById('btnAgregar').addEventListener('click', agregar);
    document.getElementById('btnGuardar').addEventListener('click', guardarCompra);
    document.getElementById('btnLimpiar').addEventListener('click', limpiarCarrito);
});
