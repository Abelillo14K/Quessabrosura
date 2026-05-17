let productosCarrito = [];
let pagosVenta = [];
let ventas = [];
let productos = [];
let productosFiltrados = [];
let metodosPago = [];
let categorias = [];

const tabla = document.getElementById('tabla');
const listaCarrito = document.getElementById('listaCarrito');
const listaPagos = document.getElementById('listaPagos');
const totalCarrito = document.getElementById('totalCarrito');
const totalVentaPago = document.getElementById('totalVentaPago');
const totalPagosEl = document.getElementById('totalPagos');
const pendientePagoEl = document.getElementById('pendientePago');
const contenedorProductos = document.getElementById('contenedorProductos');

const btnAgregarPago = document.getElementById('btnAgregarPago');
const btnCobrar = document.getElementById('btnCobrar');
const btnLimpiar = document.getElementById('btnLimpiar');
const btnAbrirPago = document.getElementById('btnAbrirPago');
const btnPagoEfectivo = document.getElementById('btnPagoEfectivo');
const btnPagoTransferencia = document.getElementById('btnPagoTransferencia');
const btnPagoTarjeta = document.getElementById('btnPagoTarjeta');

function obtenerFechaActual() {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function calcularTotalVenta() {
    return productosCarrito.reduce((total, item) => {
        return total + Number(item.cantidad) * Number(item.precio);
    }, 0);
}

function calcularTotalPagos() {
    return pagosVenta.reduce((total, pago) => {
        return total + Number(pago.monto);
    }, 0);
}

async function cargarCategorias() {
    try {
        categorias = await apiFetch('/api/categorias');

        const select = document.getElementById('filtroCategoria');
        select.innerHTML = '<option value="">Todas las categorías</option>';

        categorias.forEach(categoria => {
            if (categoria.activo != 0) {
                select.innerHTML += `
                    <option value="${categoria.id_categoria}">
                        ${categoria.nombre}
                    </option>
                `;
            }
        });

    } catch (err) {
        console.error('No se pudieron cargar categorías:', err);
    }
}

async function cargarProductos() {
    try {
        productos = await apiFetch('/api/productos');
        productosFiltrados = productos.filter(p => p.activo != 0);
        renderizarProductosPOS(productosFiltrados);

    } catch (err) {
        contenedorProductos.innerHTML = `
            <div class="empty-card">No se pudieron cargar los productos</div>
        `;
        mostrarError(err.message);
    }
}

function renderizarProductosPOS(data) {
    contenedorProductos.innerHTML = '';

    if (!data || data.length === 0) {
        contenedorProductos.innerHTML = `
            <div class="empty-card">No hay productos disponibles</div>
        `;
        return;
    }

    data.forEach(producto => {
        contenedorProductos.innerHTML += `
            <button class="producto-card" onclick="agregarProductoRapido(${producto.id_producto})">
                <span class="producto-categoria">${producto.categoria || 'Sin categoría'}</span>
                <strong>${producto.nombre}</strong>
                <small>${producto.descripcion || ''}</small>
                <span class="producto-precio">${formatearMoneda(producto.precio_venta)}</span>
            </button>
        `;
    });
}

function filtrarProductosPOS() {
    const texto = document.getElementById('buscadorProductos').value.trim().toLowerCase();
    const categoria = document.getElementById('filtroCategoria').value;

    let filtrados = productos.filter(p => p.activo != 0);

    if (categoria) {
        filtrados = filtrados.filter(p => Number(p.id_categoria) === Number(categoria));
    }

    if (texto) {
        filtrados = filtrados.filter(p => {
            return String(p.nombre || '').toLowerCase().includes(texto) ||
                   String(p.categoria || '').toLowerCase().includes(texto) ||
                   String(p.descripcion || '').toLowerCase().includes(texto);
        });
    }

    productosFiltrados = filtrados;
    renderizarProductosPOS(productosFiltrados);
}

async function cargarMetodosPago() {
    try {
        metodosPago = await apiFetch('/api/ventas/metodos-pago');
        const select = document.getElementById('metodoPago');

        select.innerHTML = '<option value="">Seleccionar método...</option>';

        metodosPago.forEach(metodo => {
            select.innerHTML += `
                <option value="${metodo.id_metodo_pago}">
                    ${metodo.nombre}
                </option>
            `;
        });

    } catch (err) {
        mostrarError(err.message);
    }
}

function agregarProductoRapido(idProducto) {
    const producto = productos.find(p => Number(p.id_producto) === Number(idProducto));

    if (!producto) {
        mostrarError('Producto no encontrado');
        return;
    }

    const observacion = document.getElementById('observacionRapida').value.trim();

    const existente = productosCarrito.find(item => {
        return Number(item.id_producto) === Number(idProducto) &&
               String(item.observacion || '') === String(observacion || '');
    });

    if (existente) {
        existente.cantidad += 1;
    } else {
        productosCarrito.push({
            id_producto: producto.id_producto,
            nombre: producto.nombre,
            cantidad: 1,
            precio: Number(producto.precio_venta),
            observacion
        });
    }

    document.getElementById('observacionRapida').value = '';

    renderizarCarrito();
    actualizarPagosUI();
}

function renderizarCarrito() {
    listaCarrito.innerHTML = '';

    if (productosCarrito.length === 0) {
        listaCarrito.innerHTML = `
            <div class="carrito-vacio">No hay productos agregados</div>
        `;

        totalCarrito.textContent = 'Q0.00';
        actualizarPagosUI();
        return;
    }

    productosCarrito.forEach((item, index) => {
        const subtotal = Number(item.cantidad) * Number(item.precio);

        listaCarrito.innerHTML += `
            <div class="carrito-item">
                <div class="carrito-info">
                    <strong>${item.nombre}</strong>
                    <span>${formatearMoneda(item.precio)} c/u</span>
                    ${item.observacion ? `<small>${item.observacion}</small>` : ''}
                </div>

                <div class="cantidad-control">
                    <button onclick="cambiarCantidad(${index}, -1)">-</button>
                    <span>${item.cantidad}</span>
                    <button onclick="cambiarCantidad(${index}, 1)">+</button>
                </div>

                <div class="carrito-subtotal">
                    <strong>${formatearMoneda(subtotal)}</strong>
                    <button class="btn-mini-delete" onclick="eliminarProducto(${index})">x</button>
                </div>
            </div>
        `;
    });

    totalCarrito.textContent = formatearMoneda(calcularTotalVenta());
    actualizarPagosUI();
}

function cambiarCantidad(index, cambio) {
    if (!productosCarrito[index]) {
        return;
    }

    productosCarrito[index].cantidad += cambio;

    if (productosCarrito[index].cantidad <= 0) {
        productosCarrito.splice(index, 1);
    }

    renderizarCarrito();
}

function eliminarProducto(index) {
    productosCarrito.splice(index, 1);
    renderizarCarrito();
}

function limpiarVenta() {
    if (productosCarrito.length === 0 && pagosVenta.length === 0) {
        mostrarError('No hay datos para limpiar');
        return;
    }

    if (!confirm('¿Limpiar toda la venta actual?')) {
        return;
    }

    productosCarrito = [];
    pagosVenta = [];

    renderizarCarrito();
    renderizarPagos();
    actualizarPagosUI();

    mostrarExito('Venta limpiada');
}

function abrirPago() {
    if (productosCarrito.length === 0) {
        mostrarError('Primero agregue productos al carrito');
        return;
    }

    document.getElementById('sectionPagos').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });

    actualizarPagosUI();
}

function agregarPago() {
    const idMetodoPago = parseInt(document.getElementById('metodoPago').value);
    const monto = parseFloat(document.getElementById('montoPago').value);
    const referencia = document.getElementById('referenciaPago').value.trim();

    if (!idMetodoPago) {
        mostrarError('Seleccione un método de pago');
        return;
    }

    if (!monto || monto <= 0) {
        mostrarError('Ingrese un monto válido');
        return;
    }

    const metodo = metodosPago.find(m => Number(m.id_metodo_pago) === Number(idMetodoPago));

    if (!metodo) {
        mostrarError('Método de pago no encontrado');
        return;
    }

    const totalVenta = calcularTotalVenta();
    const totalPagos = calcularTotalPagos();

    if (totalVenta <= 0) {
        mostrarError('Primero agregue productos a la venta');
        return;
    }

    if (Number((totalPagos + monto).toFixed(2)) > Number(totalVenta.toFixed(2))) {
        mostrarError('El monto de pagos no puede superar el total de la venta');
        return;
    }

    pagosVenta.push({
        id_metodo_pago: idMetodoPago,
        metodo: metodo.nombre,
        monto,
        referencia
    });

    document.getElementById('metodoPago').value = '';
    document.getElementById('montoPago').value = '';
    document.getElementById('referenciaPago').value = '';

    renderizarPagos();
    actualizarPagosUI();
}

function agregarPagoTotal(nombreMetodo) {
    const totalVenta = calcularTotalVenta();

    if (totalVenta <= 0) {
        mostrarError('Primero agregue productos a la venta');
        return;
    }

    const metodo = metodosPago.find(m => String(m.nombre).toLowerCase() === String(nombreMetodo).toLowerCase());

    if (!metodo) {
        mostrarError(`No existe método de pago ${nombreMetodo}`);
        return;
    }

    pagosVenta = [{
        id_metodo_pago: metodo.id_metodo_pago,
        metodo: metodo.nombre,
        monto: totalVenta,
        referencia: ''
    }];

    renderizarPagos();
    actualizarPagosUI();
    mostrarExito(`Pago total en ${metodo.nombre} agregado`);
}

function renderizarPagos() {
    listaPagos.innerHTML = '';

    if (pagosVenta.length === 0) {
        listaPagos.innerHTML = `
            <tr class="empty-row">
                <td colspan="4">No hay pagos agregados</td>
            </tr>
        `;
        return;
    }

    pagosVenta.forEach((pago, index) => {
        listaPagos.innerHTML += `
            <tr>
                <td>${pago.metodo}</td>
                <td>${formatearMoneda(pago.monto)}</td>
                <td>${pago.referencia || '—'}</td>
                <td>
                    <button class="btn-delete" onclick="eliminarPago(${index})">
                        Eliminar
                    </button>
                </td>
            </tr>
        `;
    });
}

function eliminarPago(index) {
    pagosVenta.splice(index, 1);
    renderizarPagos();
    actualizarPagosUI();
}

function actualizarPagosUI() {
    const totalVenta = calcularTotalVenta();
    const totalPagos = calcularTotalPagos();
    const pendiente = totalVenta - totalPagos;

    totalCarrito.textContent = formatearMoneda(totalVenta);
    totalVentaPago.textContent = formatearMoneda(totalVenta);
    totalPagosEl.textContent = formatearMoneda(totalPagos);
    pendientePagoEl.textContent = formatearMoneda(pendiente);
}

async function guardarVenta() {
    if (productosCarrito.length === 0) {
        mostrarError('No hay productos para cobrar');
        return;
    }

    if (pagosVenta.length === 0) {
        mostrarError('Debe agregar al menos un pago');
        return;
    }

    const totalVenta = Number(calcularTotalVenta().toFixed(2));
    const totalPagos = Number(calcularTotalPagos().toFixed(2));

    if (totalVenta !== totalPagos) {
        mostrarError('El total de pagos debe coincidir con el total de la venta');
        return;
    }

    try {
        btnCobrar.disabled = true;
        btnCobrar.textContent = 'Cobrando...';

        const data = await apiFetch('/api/ventas', {
            method: 'POST',
            body: {
                productos: productosCarrito.map(item => ({
                    id_producto: item.id_producto,
                    cantidad: item.cantidad,
                    precio: item.precio,
                    observacion: item.observacion
                })),
                pagos: pagosVenta.map(pago => ({
                    id_metodo_pago: pago.id_metodo_pago,
                    monto: pago.monto,
                    referencia: pago.referencia
                })),
                id_cliente: 1
            }
        });

        productosCarrito = [];
        pagosVenta = [];

        renderizarCarrito();
        renderizarPagos();
        actualizarPagosUI();

        await cargarVentas();

        mostrarExito(`Venta #${data.id_venta} registrada. Ticket: ${data.comprobante}`);

        setTimeout(() => {
            if (confirm('¿Desea abrir el ticket de esta venta?')) {
                window.open(`../ticket/ticket.html?id_venta=${data.id_venta}`, '_blank');
            }
        }, 500);

    } catch (err) {
        mostrarError(err.message);
    } finally {
        btnCobrar.disabled = false;
        btnCobrar.textContent = 'Confirmar Venta';
    }
}

async function cargarVentas() {
    try {
        ventas = await apiFetch('/api/ventas');
        filtrarVentas();

    } catch (err) {
        tabla.innerHTML = `
            <tr class="empty-row">
                <td colspan="8">No se pudieron cargar las ventas</td>
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
                <td colspan="8">No hay ventas registradas</td>
            </tr>
        `;
        return;
    }

    data.forEach(venta => {
        const estaAnulada = venta.anulada == 1;

        tabla.innerHTML += `
            <tr class="${estaAnulada ? 'row-anulada' : ''}">
                <td><strong>#${venta.id_venta}</strong></td>
                <td>${formatearFecha(venta.fecha)}</td>
                <td>${venta.hora ? String(venta.hora).slice(0, 5) : 'N/A'}</td>
                <td class="total-cell">${formatearMoneda(venta.total)}</td>
                <td>${venta.metodos_pago || '—'}</td>
                <td>${venta.empleado || '—'}</td>
                <td>
                    <span class="status ${estaAnulada ? 'status-anulada' : 'status-activa'}">
                        ${estaAnulada ? 'Anulada' : 'Activa'}
                    </span>
                </td>
                <td>
                    <button class="btn-view" onclick="verDetalle(${venta.id_venta})">
                        Ver
                    </button>

                    <button class="btn-toggle" onclick="abrirTicket(${venta.id_venta})">
                        Ticket
                    </button>

                    ${estaAnulada ? '' : `
                        <button class="btn-delete" onclick="anularVenta(${venta.id_venta})">
                            Anular
                        </button>
                    `}
                </td>
            </tr>
        `;
    });
}

function abrirTicket(idVenta) {
    window.open(`../ticket/ticket.html?id_venta=${idVenta}`, '_blank');
}

function actualizarResumen(data) {
    const hoy = obtenerFechaActual();

    let totalHoy = 0;
    let cantidadVentas = 0;
    let totalEfectivo = 0;
    let otrosPagos = 0;

    data.forEach(venta => {
        if (venta.anulada == 1) {
            return;
        }

        const fechaVenta = String(venta.fecha).slice(0, 10);
        const monto = Number(venta.total || 0);

        if (fechaVenta === hoy) {
            totalHoy += monto;
            cantidadVentas++;
        }

        const metodos = String(venta.metodos_pago || '').toLowerCase();

        if (metodos.includes('efectivo') && !metodos.includes(',')) {
            totalEfectivo += monto;
        } else {
            otrosPagos += monto;
        }
    });

    document.getElementById('ventasHoy').textContent = formatearMoneda(totalHoy);
    document.getElementById('totalTransacciones').textContent = cantidadVentas;
    document.getElementById('efectivoTotal').textContent = formatearMoneda(totalEfectivo);
    document.getElementById('otrosPagosTotal').textContent = formatearMoneda(otrosPagos);
}

function filtrarVentas() {
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;
    const busqueda = document.getElementById('busqueda').value.trim().toLowerCase();

    let filtradas = [...ventas];

    if (fechaInicio) {
        filtradas = filtradas.filter(venta => {
            return String(venta.fecha).slice(0, 10) >= fechaInicio;
        });
    }

    if (fechaFin) {
        filtradas = filtradas.filter(venta => {
            return String(venta.fecha).slice(0, 10) <= fechaFin;
        });
    }

    if (busqueda) {
        filtradas = filtradas.filter(venta => {
            return String(venta.id_venta).includes(busqueda) ||
                   String(venta.empleado || '').toLowerCase().includes(busqueda) ||
                   String(venta.metodos_pago || '').toLowerCase().includes(busqueda);
        });
    }

    renderizarTabla(filtradas);
    actualizarResumen(filtradas);
}

async function verDetalle(id) {
    try {
        const data = await apiFetch(`/api/ventas/${id}/detalle`);

        const body = document.getElementById('detalleBody');
        const pagosBody = document.getElementById('detallePagos');

        document.getElementById('detalleTitulo').textContent = `Detalle de Venta #${id}`;

        body.innerHTML = '';
        pagosBody.innerHTML = '';

        let total = 0;

        data.detalle.forEach(detalle => {
            total += Number(detalle.subtotal || 0);

            body.innerHTML += `
                <tr>
                    <td><strong>${detalle.producto}</strong></td>
                    <td>${detalle.cantidad}</td>
                    <td>${formatearMoneda(detalle.precio_unitario)}</td>
                    <td>${formatearMoneda(detalle.subtotal)}</td>
                    <td>${detalle.observacion || '—'}</td>
                </tr>
            `;
        });

        if (data.detalle.length === 0) {
            body.innerHTML = `
                <tr class="empty-row">
                    <td colspan="5">Esta venta no tiene detalle registrado</td>
                </tr>
            `;
        }

        data.pagos.forEach(pago => {
            pagosBody.innerHTML += `
                <tr>
                    <td>${pago.metodo_pago}</td>
                    <td>${formatearMoneda(pago.monto)}</td>
                    <td>${pago.referencia || '—'}</td>
                </tr>
            `;
        });

        if (data.pagos.length === 0) {
            pagosBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="3">No hay pagos registrados</td>
                </tr>
            `;
        }

        document.getElementById('detalleTotal').textContent = formatearMoneda(total);
        document.getElementById('modalDetalle').style.display = 'block';

    } catch (err) {
        mostrarError(err.message);
    }
}

async function anularVenta(id) {
    if (!confirm(`¿Anular la venta #${id}? Se devolverán los insumos al inventario.`)) {
        return;
    }

    try {
        await apiFetch(`/api/ventas/${id}`, {
            method: 'DELETE'
        });

        await cargarVentas();

        mostrarExito(`Venta #${id} anulada`);

    } catch (err) {
        mostrarError(err.message);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const empleado = verificarSesion();

    if (!empleado) {
        return;
    }

    const hoy = obtenerFechaActual();
    document.getElementById('fechaInicio').value = hoy;
    document.getElementById('fechaFin').value = hoy;

    await cargarCategorias();
    await cargarProductos();
    await cargarMetodosPago();
    await cargarVentas();

    renderizarCarrito();
    renderizarPagos();
    actualizarPagosUI();

    btnAgregarPago.addEventListener('click', agregarPago);
    btnCobrar.addEventListener('click', guardarVenta);
    btnLimpiar.addEventListener('click', limpiarVenta);
    btnAbrirPago.addEventListener('click', abrirPago);
    btnPagoEfectivo.addEventListener('click', () => agregarPagoTotal('Efectivo'));
    btnPagoTransferencia.addEventListener('click', () => agregarPagoTotal('Transferencia'));
    btnPagoTarjeta.addEventListener('click', () => agregarPagoTotal('Tarjeta'));
});