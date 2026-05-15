let productosCarrito = [];
let ventas = [];

const tabla = document.getElementById('tabla');
const lista = document.getElementById('lista');
const totalCarrito = document.getElementById('totalCarrito');

const btnAgregar = document.getElementById('btnAgregar');
const btnCobrar = document.getElementById('btnCobrar');
const btnLimpiar = document.getElementById('btnLimpiar');

function getMethodClass(metodo) {
    const map = {
        efectivo: 'efectivo',
        transferencia: 'transferencia'
    };

    const metodoNormalizado = String(metodo || '').toLowerCase();
    return map[metodoNormalizado] || '';
}

function getMethodLabel(metodo) {
    const texto = String(metodo || '');

    if (!texto) {
        return '—';
    }

    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function obtenerFechaActual() {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

async function cargarProductos() {
    try {
        const data = await apiFetch('/api/productos');
        const select = document.getElementById('producto');

        select.innerHTML = '<option value="">Seleccionar producto...</option>';

        data.forEach(producto => {
            const activo = producto.activo != 0;
            const stock = Number(producto.stock || 0);

            if (activo && stock > 0) {
                select.innerHTML += `
                    <option 
                        value="${producto.id_producto}"
                        data-precio="${producto.precio_venta}"
                        data-stock="${stock}"
                    >
                        ${producto.nombre} - Stock: ${stock}
                    </option>
                `;
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
    } else {
        document.getElementById('precio').value = '';
    }
}

function agregar() {
    const select = document.getElementById('producto');
    const option = select.options[select.selectedIndex];

    const idProducto = parseInt(select.value);
    const nombre = option?.text?.split(' - Stock:')[0]?.trim() || 'Desconocido';
    const cantidad = parseInt(document.getElementById('cantidad').value);
    const precio = parseFloat(document.getElementById('precio').value);
    const stockDisponible = parseInt(option?.dataset?.stock || 0);

    if (!idProducto) {
        mostrarError('Seleccione un producto');
        return;
    }

    if (!cantidad || cantidad < 1) {
        mostrarError('Ingrese una cantidad válida');
        return;
    }

    if (!precio || precio <= 0) {
        mostrarError('Ingrese un precio válido');
        return;
    }

    const existente = productosCarrito.find(producto => producto.id_producto === idProducto);
    const cantidadEnCarrito = existente ? Number(existente.cantidad) : 0;
    const cantidadTotal = cantidadEnCarrito + cantidad;

    if (cantidadTotal > stockDisponible) {
        mostrarError(`Stock insuficiente. Disponible: ${stockDisponible}, en carrito + solicitado: ${cantidadTotal}`);
        return;
    }

    if (existente) {
        existente.cantidad += cantidad;
        existente.precio = precio;
    } else {
        productosCarrito.push({
            id_producto: idProducto,
            nombre,
            cantidad,
            precio
        });
    }

    select.value = '';
    document.getElementById('cantidad').value = '';
    document.getElementById('precio').value = '';

    mostrarLista();
    mostrarExito('Producto agregado');
}

function mostrarLista() {
    lista.innerHTML = '';

    if (productosCarrito.length === 0) {
        lista.innerHTML = `
            <tr class="empty-row">
                <td colspan="5">No hay productos agregados</td>
            </tr>
        `;

        totalCarrito.textContent = 'Q0.00';
        return;
    }

    let total = 0;

    productosCarrito.forEach((producto, index) => {
        const subtotal = Number(producto.cantidad) * Number(producto.precio);
        total += subtotal;

        lista.innerHTML += `
            <tr>
                <td><strong>${producto.nombre}</strong></td>
                <td>${producto.cantidad}</td>
                <td>${formatearMoneda(producto.precio)}</td>
                <td>${formatearMoneda(subtotal)}</td>
                <td>
                    <button class="btn-delete" onclick="eliminarProducto(${index})">
                        Eliminar
                    </button>
                </td>
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
    if (productosCarrito.length === 0) {
        mostrarError('No hay productos para limpiar');
        return;
    }

    if (!confirm('¿Limpiar todos los productos?')) {
        return;
    }

    productosCarrito = [];
    mostrarLista();
    mostrarExito('Venta limpiada');
}

async function guardarVenta() {
    const metodoPago = document.getElementById('metodoPago').value;

    if (!metodoPago) {
        mostrarError('Seleccione un método de pago');
        return;
    }

    if (productosCarrito.length === 0) {
        mostrarError('No hay productos para cobrar');
        return;
    }

    const empleado = getEmpleadoSesion();

    if (!empleado) {
        mostrarError('No hay empleado en sesión');
        return;
    }

    try {
        btnCobrar.disabled = true;
        btnCobrar.textContent = 'Cobrando...';

        const data = await apiFetch('/api/ventas', {
            method: 'POST',
            body: {
                productos: productosCarrito,
                metodo_pago: metodoPago,
                id_empleado: empleado.id_empleado
            }
        });

        productosCarrito = [];
        mostrarLista();

        document.getElementById('metodoPago').value = '';

        await cargarProductos();
        await cargarVentas();

        mostrarExito(`Venta #${data.id_venta} registrada`);

    } catch (err) {
        mostrarError(err.message);
    } finally {
        btnCobrar.disabled = false;
        btnCobrar.textContent = 'Cobrar';
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
                <td>
                    <span class="method-badge ${getMethodClass(venta.metodo_pago)}">
                        ${getMethodLabel(venta.metodo_pago)}
                    </span>
                </td>
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

function actualizarResumen(data) {
    const hoy = obtenerFechaActual();

    let totalHoy = 0;
    let totalEfectivo = 0;
    let totalTransferencia = 0;

    data.forEach(venta => {
        if (venta.anulada == 1) {
            return;
        }

        const fechaVenta = String(venta.fecha).slice(0, 10);
        const monto = parseFloat(venta.total || 0);
        const metodo = String(venta.metodo_pago || '').toLowerCase();

        if (fechaVenta === hoy) {
            totalHoy += monto;
        }

        if (metodo === 'efectivo') {
            totalEfectivo += monto;
        }

        if (metodo === 'transferencia') {
            totalTransferencia += monto;
        }
    });

    document.getElementById('ventasHoy').textContent = formatearMoneda(totalHoy);
    document.getElementById('totalTransacciones').textContent = data.filter(v => v.anulada != 1).length;
    document.getElementById('efectivoTotal').textContent = formatearMoneda(totalEfectivo);
    document.getElementById('transferenciaTotal').textContent = formatearMoneda(totalTransferencia);
}

function filtrarVentas() {
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;
    const metodo = document.getElementById('filtroMetodo').value;
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

    if (metodo) {
        filtradas = filtradas.filter(venta => {
            return String(venta.metodo_pago || '').toLowerCase() === metodo.toLowerCase();
        });
    }

    if (busqueda) {
        filtradas = filtradas.filter(venta => {
            return String(venta.id_venta).includes(busqueda) ||
                   String(venta.empleado || '').toLowerCase().includes(busqueda) ||
                   String(venta.metodo_pago || '').toLowerCase().includes(busqueda);
        });
    }

    renderizarTabla(filtradas);
    actualizarResumen(filtradas);
}

async function verDetalle(id) {
    try {
        const data = await apiFetch(`/api/ventas/${id}/detalle`);
        const body = document.getElementById('detalleBody');

        document.getElementById('detalleTitulo').textContent = `Detalle de Venta #${id}`;
        body.innerHTML = '';

        if (!data || data.length === 0) {
            body.innerHTML = `
                <tr class="empty-row">
                    <td colspan="4">Esta venta no tiene detalle registrado</td>
                </tr>
            `;

            document.getElementById('detalleTotal').textContent = 'Q0.00';
            document.getElementById('modalDetalle').style.display = 'block';
            return;
        }

        let total = 0;

        data.forEach(detalle => {
            total += parseFloat(detalle.subtotal || 0);

            body.innerHTML += `
                <tr>
                    <td><strong>${detalle.producto}</strong></td>
                    <td>${detalle.cantidad}</td>
                    <td>${formatearMoneda(detalle.precio_venta)}</td>
                    <td>${formatearMoneda(detalle.subtotal)}</td>
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
    if (!confirm(`¿Anular la venta #${id}? Se revertirá el stock.`)) {
        return;
    }

    try {
        await apiFetch(`/api/ventas/${id}`, {
            method: 'DELETE'
        });

        await cargarProductos();
        await cargarVentas();

        mostrarExito(`Venta #${id} anulada`);

    } catch (err) {
        mostrarError(err.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const empleado = verificarSesion();

    if (!empleado) {
        return;
    }

    const hoy = obtenerFechaActual();
    document.getElementById('fechaInicio').value = hoy;
    document.getElementById('fechaFin').value = hoy;

    cargarProductos();
    cargarVentas();
    mostrarLista();

    document.getElementById('producto').addEventListener('change', cargarPrecio);
    btnAgregar.addEventListener('click', agregar);
    btnCobrar.addEventListener('click', guardarVenta);
    btnLimpiar.addEventListener('click', limpiarCarrito);
});