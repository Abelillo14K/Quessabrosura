let insumosCompra = [];
let insumos = [];
let compras = [];
let proveedores = [];
let filtroActual = '';

const lista = document.getElementById('lista');
const tabla = document.getElementById('tabla');
const totalCompra = document.getElementById('totalCompra');

const btnAgregar = document.getElementById('btnAgregar');
const btnGuardar = document.getElementById('btnGuardar');
const btnLimpiar = document.getElementById('btnLimpiar');

async function cargarProveedores() {
    try {
        proveedores = await apiFetch('/api/proveedores');

        const select = document.getElementById('proveedor');
        select.innerHTML = '<option value="">Sin proveedor</option>';

        proveedores.forEach(proveedor => {
            if (proveedor.activo != 0) {
                select.innerHTML += `
                    <option value="${proveedor.id_proveedor}">
                        ${proveedor.nombre}
                    </option>
                `;
            }
        });

    } catch (err) {
        mostrarError(err.message);
    }
}

async function cargarInsumos() {
    try {
        insumos = await apiFetch('/api/insumos');

        const select = document.getElementById('insumo');
        select.innerHTML = '<option value="">Seleccionar insumo...</option>';

        insumos.forEach(insumo => {
            if (insumo.activo != 0) {
                select.innerHTML += `
                    <option 
                        value="${insumo.id_insumo}"
                        data-unidad="${insumo.unidad_medida}"
                        data-costo="${insumo.costo_unitario}"
                    >
                        ${insumo.nombre} (${insumo.unidad_medida})
                    </option>
                `;
            }
        });

    } catch (err) {
        mostrarError(err.message);
    }
}

function cargarPrecioSugerido() {
    const select = document.getElementById('insumo');
    const option = select.options[select.selectedIndex];

    if (option && option.dataset.costo) {
        document.getElementById('precio_unitario').value = option.dataset.costo;
    } else {
        document.getElementById('precio_unitario').value = '';
    }
}

function calcularTotalCompra() {
    return insumosCompra.reduce((total, item) => {
        return total + Number(item.cantidad) * Number(item.precio_unitario);
    }, 0);
}

function agregarInsumo() {
    const select = document.getElementById('insumo');

    const idInsumo = parseInt(select.value);
    const cantidad = parseFloat(document.getElementById('cantidad').value);
    const precioUnitario = parseFloat(document.getElementById('precio_unitario').value);

    if (!idInsumo) {
        mostrarError('Seleccione un insumo');
        return;
    }

    if (isNaN(cantidad) || cantidad <= 0) {
        mostrarError('Ingrese una cantidad válida');
        return;
    }

    if (isNaN(precioUnitario) || precioUnitario < 0) {
        mostrarError('Ingrese un precio unitario válido');
        return;
    }

    const insumo = insumos.find(i => Number(i.id_insumo) === Number(idInsumo));

    if (!insumo) {
        mostrarError('Insumo no encontrado');
        return;
    }

    const existente = insumosCompra.find(item => Number(item.id_insumo) === Number(idInsumo));

    if (existente) {
        existente.cantidad += cantidad;
        existente.precio_unitario = precioUnitario;
    } else {
        insumosCompra.push({
            id_insumo: idInsumo,
            nombre: insumo.nombre,
            unidad_medida: insumo.unidad_medida,
            cantidad,
            precio_unitario: precioUnitario
        });
    }

    select.value = '';
    document.getElementById('cantidad').value = '';
    document.getElementById('precio_unitario').value = '';

    renderizarLista();
    mostrarExito('Insumo agregado');
}

function renderizarLista() {
    lista.innerHTML = '';

    if (insumosCompra.length === 0) {
        lista.innerHTML = `
            <tr class="empty-row">
                <td colspan="6">No hay insumos agregados</td>
            </tr>
        `;

        totalCompra.textContent = 'Q0.00';
        return;
    }

    insumosCompra.forEach((item, index) => {
        const subtotal = Number(item.cantidad) * Number(item.precio_unitario);

        lista.innerHTML += `
            <tr>
                <td><strong>${item.nombre}</strong></td>
                <td>${item.unidad_medida}</td>
                <td>${Number(item.cantidad).toFixed(2)}</td>
                <td>${formatearMoneda(item.precio_unitario)}</td>
                <td>${formatearMoneda(subtotal)}</td>
                <td>
                    <button class="btn-delete" onclick="eliminarInsumo(${index})">
                        Eliminar
                    </button>
                </td>
            </tr>
        `;
    });

    totalCompra.textContent = formatearMoneda(calcularTotalCompra());
}

function eliminarInsumo(index) {
    insumosCompra.splice(index, 1);
    renderizarLista();
}

function limpiarCompra() {
    if (insumosCompra.length === 0) {
        mostrarError('No hay insumos para limpiar');
        return;
    }

    if (!confirm('¿Limpiar la compra actual?')) {
        return;
    }

    insumosCompra = [];

    document.getElementById('proveedor').value = '';
    renderizarLista();

    mostrarExito('Compra limpiada');
}

async function guardarCompra() {
    if (insumosCompra.length === 0) {
        mostrarError('Debe agregar al menos un insumo');
        return;
    }

    try {
        btnGuardar.disabled = true;
        btnGuardar.textContent = 'Guardando...';

        const data = await apiFetch('/api/compras', {
            method: 'POST',
            body: {
                insumos: insumosCompra.map(item => ({
                    id_insumo: item.id_insumo,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio_unitario
                })),
                id_proveedor: document.getElementById('proveedor').value || null
            }
        });

        insumosCompra = [];

        document.getElementById('proveedor').value = '';

        renderizarLista();

        await cargarInsumos();
        await cargarCompras();

        mostrarExito(`Compra #${data.id_compra} registrada`);

    } catch (err) {
        mostrarError(err.message);
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar Compra';
    }
}

async function cargarCompras() {
    try {
        compras = await apiFetch('/api/compras');
        aplicarFiltro();

    } catch (err) {
        tabla.innerHTML = `
            <tr class="empty-row">
                <td colspan="8">No se pudieron cargar las compras</td>
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
                <td colspan="8">No se encontraron compras</td>
            </tr>
        `;
        return;
    }

    data.forEach(compra => {
        const estaAnulada = compra.anulada == 1;

        tabla.innerHTML += `
            <tr class="${estaAnulada ? 'row-anulada' : ''}">
                <td><strong>#${compra.id_compra}</strong></td>
                <td>${formatearFecha(compra.fecha)}</td>
                <td>${compra.hora ? String(compra.hora).slice(0, 5) : 'N/A'}</td>
                <td>${formatearMoneda(compra.total)}</td>
                <td>${compra.proveedor || '—'}</td>
                <td>${compra.empleado || '—'}</td>
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

function buscarCompra() {
    filtroActual = document.getElementById('busqueda').value.trim().toLowerCase();
    aplicarFiltro();
}

function aplicarFiltro() {
    if (!filtroActual) {
        renderizarTabla(compras);
        return;
    }

    const filtradas = compras.filter(compra => {
        return String(compra.id_compra).includes(filtroActual) ||
               String(compra.proveedor || '').toLowerCase().includes(filtroActual) ||
               String(compra.empleado || '').toLowerCase().includes(filtroActual);
    });

    renderizarTabla(filtradas);
}

async function verDetalle(id) {
    try {
        const data = await apiFetch(`/api/compras/${id}/detalle`);

        const body = document.getElementById('detalleBody');
        body.innerHTML = '';

        document.getElementById('detalleTitulo').textContent = `Detalle de Compra #${id}`;

        let total = 0;

        data.detalle.forEach(item => {
            total += Number(item.subtotal || 0);

            body.innerHTML += `
                <tr>
                    <td><strong>${item.insumo}</strong></td>
                    <td>${item.unidad_medida}</td>
                    <td>${Number(item.cantidad || 0).toFixed(2)}</td>
                    <td>${formatearMoneda(item.precio_unitario)}</td>
                    <td>${formatearMoneda(item.subtotal)}</td>
                </tr>
            `;
        });

        if (data.detalle.length === 0) {
            body.innerHTML = `
                <tr class="empty-row">
                    <td colspan="5">Esta compra no tiene detalle</td>
                </tr>
            `;
        }

        document.getElementById('detalleTotal').textContent = formatearMoneda(total);
        document.getElementById('modalDetalle').style.display = 'block';

    } catch (err) {
        mostrarError(err.message);
    }
}

async function anularCompra(id) {
    if (!confirm(`¿Anular la compra #${id}? Esto restará del inventario los insumos comprados.`)) {
        return;
    }

    try {
        await apiFetch(`/api/compras/${id}`, {
            method: 'DELETE'
        });

        await cargarInsumos();
        await cargarCompras();

        mostrarExito(`Compra #${id} anulada`);

    } catch (err) {
        mostrarError(err.message);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const empleado = verificarSesion();

    if (!empleado) {
        return;
    }

    await cargarProveedores();
    await cargarInsumos();
    await cargarCompras();

    renderizarLista();

    document.getElementById('insumo').addEventListener('change', cargarPrecioSugerido);
    btnAgregar.addEventListener('click', agregarInsumo);
    btnGuardar.addEventListener('click', guardarCompra);
    btnLimpiar.addEventListener('click', limpiarCompra);
});