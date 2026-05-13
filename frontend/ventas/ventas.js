let productosCarrito = [];
let ventas = [];

const tabla = document.getElementById('tabla');
const lista = document.getElementById('lista');
const totalCarrito = document.getElementById('totalCarrito');

function getMethodClass(metodo) {
    const map = { 'efectivo': 'efectivo', 'transferencia': 'transferencia' };
    const lower = (metodo || '').toLowerCase();
    return map[lower] || '';
}

function getMethodLabel(metodo) {
    return (metodo || '').charAt(0).toUpperCase() + (metodo || '').slice(1);
}

async function cargarProductos() {
    try {
        const data = await apiFetch('/api/productos');
        const select = document.getElementById('producto');
        select.innerHTML = '<option value="">Seleccionar producto...</option>';
        data.forEach(p => {
            if (p.activo != 0) {
                select.innerHTML += `<option value="${p.id_producto}" data-precio="${p.precio_venta}">${p.nombre}</option>`;
            }
        });
    } catch (err) {
        mostrarError(err.message);
    }
}

function cargarPrecio() {
    const select = document.getElementById('producto');
    const option = select.options[select.selectedIndex];
    if (option && option.dataset.precio) {
        document.getElementById('precio').value = option.dataset.precio;
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

    productosCarrito.push({ id_producto, nombre, cantidad, precio });

    select.value = '';
    document.getElementById('cantidad').value = '';
    document.getElementById('precio').value = '';

    mostrarLista();
    mostrarExito('Producto agregado');
}

function mostrarLista() {
    lista.innerHTML = '';

    if (productosCarrito.length === 0) {
        lista.innerHTML = '<tr class="empty-row"><td colspan="5">No hay productos agregados</td></tr>';
        totalCarrito.textContent = 'Q0.00';
        return;
    }

    let total = 0;
    productosCarrito.forEach((p, index) => {
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
    productosCarrito.splice(index, 1);
    mostrarLista();
}

function limpiarCarrito() {
    if (productosCarrito.length === 0) return;
    if (!confirm('¿Limpiar todos los productos?')) return;
    productosCarrito = [];
    mostrarLista();
}

async function guardarVenta() {
    const metodo_pago = document.getElementById('metodoPago').value;

    if (!metodo_pago) {
        mostrarError('Seleccione un método de pago');
        return;
    }

    if (productosCarrito.length === 0) {
        mostrarError('No hay productos para cobrar');
        return;
    }

    const empleado = getEmpleadoSesion();

    try {
        const data = await apiFetch('/api/ventas', {
            method: 'POST',
            body: {
                productos: productosCarrito,
                metodo_pago,
                id_empleado: empleado ? empleado.id_empleado : null
            }
        });
        productosCarrito = [];
        mostrarLista();
        document.getElementById('metodoPago').value = '';
        await cargarVentas();
        mostrarExito(`Venta #${data.id_venta} registrada`);
    } catch (err) {
        mostrarError(err.message);
    }
}

async function cargarVentas() {
    try {
        const data = await apiFetch('/api/ventas');
        ventas = data;
        renderizarTabla(data);
        actualizarResumen(data);
    } catch (err) {
        mostrarError(err.message);
    }
}

function renderizarTabla(data) {
    tabla.innerHTML = '';

    if (data.length === 0) {
        tabla.innerHTML = '<tr class="empty-row"><td colspan="8">No hay ventas registradas</td></tr>';
        return;
    }

    data.forEach(v => {
        tabla.innerHTML += `
            <tr>
                <td><strong>#${v.id_venta}</strong></td>
                <td>${v.fecha}</td>
                <td>${v.hora ? v.hora.slice(0, 5) : 'N/A'}</td>
                <td class="total-cell">${formatearMoneda(v.total)}</td>
                <td><span class="method-badge ${getMethodClass(v.metodo_pago)}">${getMethodLabel(v.metodo_pago)}</span></td>
                <td>${v.empleado || '—'}</td>
                <td><span class="badge badge-success">Activa</span></td>
                <td>
                    <button class="btn-view" onclick="verDetalle(${v.id_venta})">Ver</button>
                    <button class="btn-delete" onclick="anularVenta(${v.id_venta})">Anular</button>
                </td>
            </tr>
        `;
    });
}

function actualizarResumen(data) {
    const hoy = new Date().toISOString().split('T')[0];

    let totalHoy = 0, totalEfectivo = 0, totalTransferencia = 0;

    data.forEach(v => {
        const monto = parseFloat(v.total);
        if (v.fecha === hoy) totalHoy += monto;
        if (v.metodo_pago && v.metodo_pago.toLowerCase() === 'efectivo') totalEfectivo += monto;
        else totalTransferencia += monto;
    });

    document.getElementById('ventasHoy').textContent = formatearMoneda(totalHoy);
    document.getElementById('totalTransacciones').textContent = data.length;
    document.getElementById('efectivoTotal').textContent = formatearMoneda(totalEfectivo);
    document.getElementById('tarjetaTotal').textContent = formatearMoneda(0);
    document.getElementById('transferenciaTotal').textContent = formatearMoneda(totalTransferencia);
}

function filtrarVentas() {
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;
    const metodo = document.getElementById('filtroMetodo').value;
    const busqueda = document.getElementById('busqueda').value.toLowerCase();

    let filtradas = [...ventas];

    if (fechaInicio) filtradas = filtradas.filter(v => v.fecha >= fechaInicio);
    if (fechaFin) filtradas = filtradas.filter(v => v.fecha <= fechaFin);
    if (metodo) filtradas = filtradas.filter(v => (v.metodo_pago || '').toLowerCase() === metodo.toLowerCase());
    if (busqueda) {
        filtradas = filtradas.filter(v =>
            String(v.id_venta).includes(busqueda) ||
            (v.empleado && v.empleado.toLowerCase().includes(busqueda)) ||
            (v.metodo_pago && v.metodo_pago.toLowerCase().includes(busqueda))
        );
    }

    renderizarTabla(filtradas);
    actualizarResumen(filtradas);
}

async function verDetalle(id) {
    try {
        const data = await apiFetch(`/api/ventas/${id}/detalle`);
        document.getElementById('detalleTitulo').textContent = `Detalle de Venta #${id}`;
        const body = document.getElementById('detalleBody');
        body.innerHTML = '';
        let total = 0;

        data.forEach(d => {
            total += parseFloat(d.subtotal);
            body.innerHTML += `
                <tr>
                    <td><strong>${d.producto}</strong></td>
                    <td>${d.cantidad}</td>
                    <td>${formatearMoneda(d.precio_venta)}</td>
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

async function anularVenta(id) {
    if (!confirm(`¿Anular la venta #${id}? Se revertirá el stock.`)) return;

    try {
        await apiFetch(`/api/ventas/${id}`, { method: 'DELETE' });
        await cargarVentas();
        mostrarExito(`Venta #${id} anulada`);
    } catch (err) {
        mostrarError(err.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    verificarSesion();
    cargarProductos();
    cargarVentas();

    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fechaInicio').value = hoy;
    document.getElementById('fechaFin').value = hoy;

    document.getElementById('producto').addEventListener('change', cargarPrecio);
    document.getElementById('btnAgregar').addEventListener('click', agregar);
    document.getElementById('btnCobrar').addEventListener('click', guardarVenta);
    document.getElementById('btnLimpiar').addEventListener('click', limpiarCarrito);
});
