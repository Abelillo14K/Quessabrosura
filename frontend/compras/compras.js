let productos = [];
let historialCompleto = [];
let filtroActual = '';

const lista = document.getElementById('lista');
const historial = document.getElementById('historial');
const totalCarrito = document.getElementById('totalCarrito');

const btnAgregar = document.getElementById('btnAgregar');
const btnGuardar = document.getElementById('btnGuardar');
const btnLimpiar = document.getElementById('btnLimpiar');

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

function agregar() {
    const select = document.getElementById('producto');
    const idProducto = parseInt(select.value);
    const nombre = select.options[select.selectedIndex]?.text.trim() || 'Desconocido';
    const cantidad = parseInt(document.getElementById('cantidad').value);
    const precio = parseFloat(document.getElementById('precio').value);

    if (!idProducto) {
        mostrarError('Seleccione un producto');
        return;
    }

    if (!cantidad || cantidad < 1) {
        mostrarError('Ingrese una cantidad válida');
        return;
    }

    if (!precio || precio <= 0) {
        mostrarError('Ingrese un precio de compra válido');
        return;
    }

    const existente = productos.find(p => p.id_producto === idProducto && p.precio === precio);

    if (existente) {
        existente.cantidad += cantidad;
    } else {
        productos.push({
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
    mostrarExito('Producto agregado a la compra');
}

function mostrarLista() {
    lista.innerHTML = '';

    if (productos.length === 0) {
        lista.innerHTML = `
            <tr class="empty-row">
                <td colspan="5">No hay productos agregados</td>
            </tr>
        `;
        totalCarrito.textContent = 'Q0.00';
        return;
    }

    let total = 0;

    productos.forEach((producto, index) => {
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
    productos.splice(index, 1);
    mostrarLista();
}

function limpiarCarrito() {
    if (productos.length === 0) {
        mostrarError('No hay productos para limpiar');
        return;
    }

    if (!confirm('¿Limpiar todos los productos de la compra?')) {
        return;
    }

    productos = [];
    mostrarLista();
    mostrarExito('Compra limpiada');
}

async function guardarCompra() {
    if (productos.length === 0) {
        mostrarError('No hay productos para guardar');
        return;
    }

    try {
        btnGuardar.disabled = true;
        btnGuardar.textContent = 'Guardando...';

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
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar Compra';
    }
}

async function cargarHistorial() {
    try {
        historialCompleto = await apiFetch('/api/compras');
        aplicarFiltroHistorial();

    } catch (err) {
        historial.innerHTML = `
            <tr class="empty-row">
                <td colspan="5">No se pudo cargar el historial</td>
            </tr>
        `;
        mostrarError(err.message);
    }
}

function buscarHistorial() {
    filtroActual = document.getElementById('busqueda').value.trim().toLowerCase();
    aplicarFiltroHistorial();
}

function aplicarFiltroHistorial() {
    historial.innerHTML = '';

    let data = historialCompleto;

    if (filtroActual) {
        data = data.filter(compra => {
            return String(compra.id_compra).includes(filtroActual);
        });
    }

    if (data.length === 0) {
        historial.innerHTML = `
            <tr class="empty-row">
                <td colspan="5">No se encontraron compras</td>
            </tr>
        `;
        return;
    }

    data.forEach(compra => {
        const estaAnulada = compra.anulada == 1;

        historial.innerHTML += `
            <tr class="${estaAnulada ? 'row-anulada' : ''}">
                <td>#${compra.id_compra}</td>
                <td>${formatearFecha(compra.fecha)}</td>
                <td>${formatearMoneda(compra.total)}</td>
                <td>
                    <span class="status ${estaAnulada ? 'status-anulada' : 'status-activa'}">
                        ${estaAnulada ? 'Anulada' : 'Activa'}
                    </span>
                </td>
                <td>
                    <button class="btn-view" onclick="verDetalle(${compra.id_compra})">
                        Ver
                    </button>
                    ${estaAnulada ? '' : `
                        <button class="btn-delete" onclick="anularCompra(${compra.id_compra})">
                            Anular
                        </button>
                    `}
                </td>
            </tr>
        `;
    });
}

async function verDetalle(id) {
    try {
        const data = await apiFetch(`/api/compras/${id}/detalle`);
        const body = document.getElementById('detalleBody');

        document.getElementById('detalleTitulo').textContent = `Detalle de Compra #${id}`;
        body.innerHTML = '';

        if (data.length === 0) {
            body.innerHTML = `
                <tr class="empty-row">
                    <td colspan="4">Esta compra no tiene detalle registrado</td>
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
                    <td>${formatearMoneda(detalle.precio_compra)}</td>
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

async function anularCompra(id) {
    if (!confirm(`¿Está seguro de anular la compra #${id}? Se revertirá el stock.`)) {
        return;
    }

    try {
        await apiFetch(`/api/compras/${id}`, {
            method: 'DELETE'
        });

        await cargarHistorial();
        mostrarExito(`Compra #${id} anulada`);

    } catch (err) {
        mostrarError(err.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const empleado = verificarSesion();

    if (!empleado) {
        return;
    }

    cargarProductos();
    cargarHistorial();
    mostrarLista();

    btnAgregar.addEventListener('click', agregar);
    btnGuardar.addEventListener('click', guardarCompra);
    btnLimpiar.addEventListener('click', limpiarCarrito);
});