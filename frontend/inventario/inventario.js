let insumos = [];
let filtroActual = '';

const tabla = document.getElementById('tabla');
const btnAgregar = document.getElementById('btnAgregar');
const btnGuardar = document.getElementById('btnGuardar');
const btnGuardarStock = document.getElementById('btnGuardarStock');

function getEstadoClass(estado) {
    const estadoNormalizado = String(estado || '').toLowerCase();

    if (estadoNormalizado === 'agotado') {
        return 'stock-agotado';
    }

    if (estadoNormalizado === 'bajo') {
        return 'stock-bajo';
    }

    return 'stock-normal';
}

function getEstadoTexto(estado) {
    const estadoNormalizado = String(estado || '').toLowerCase();

    if (estadoNormalizado === 'agotado') {
        return 'Agotado';
    }

    if (estadoNormalizado === 'bajo') {
        return 'Stock Bajo';
    }

    return 'Suficiente';
}

async function cargarInsumos() {
    try {
        insumos = await apiFetch('/api/insumos');
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
                <td colspan="8">No hay insumos registrados</td>
            </tr>
        `;
        return;
    }

    data.forEach(insumo => {
        const activo = insumo.activo == 1;
        const estadoClass = getEstadoClass(insumo.estado_stock);

        tabla.innerHTML += `
            <tr class="${activo ? '' : 'row-inactivo'}">
                <td>${insumo.id_insumo}</td>
                <td><strong>${insumo.nombre}</strong></td>
                <td>${insumo.unidad_medida}</td>
                <td>
                    <span class="stock-badge ${estadoClass}">
                        ${Number(insumo.stock || 0).toFixed(2)}
                    </span>
                </td>
                <td>${Number(insumo.stock_minimo || 0).toFixed(2)}</td>
                <td>${formatearMoneda(insumo.costo_unitario)}</td>
                <td>
                    <span class="stock-badge ${estadoClass}">
                        ${getEstadoTexto(insumo.estado_stock)}
                    </span>
                </td>
                <td>
                    <button class="btn-edit" onclick="abrirModalEditar(${insumo.id_insumo})">
                        Editar
                    </button>

                    <button class="btn-toggle" onclick="abrirModalStock(${insumo.id_insumo})">
                        Stock
                    </button>

                    ${activo ? `
                        <button class="btn-delete" onclick="desactivarInsumo(${insumo.id_insumo})">
                            Desactivar
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    });
}

async function crearInsumo() {
    const nombre = document.getElementById('nombre').value.trim();
    const unidad_medida = document.getElementById('unidad_medida').value;
    const stock = parseFloat(document.getElementById('stock').value || 0);
    const stock_minimo = parseFloat(document.getElementById('stock_minimo').value || 0);
    const costo_unitario = parseFloat(document.getElementById('costo_unitario').value || 0);

    if (!nombre) {
        mostrarError('Ingrese el nombre del insumo');
        return;
    }

    if (!unidad_medida) {
        mostrarError('Seleccione una unidad de medida');
        return;
    }

    if (stock < 0 || stock_minimo < 0 || costo_unitario < 0) {
        mostrarError('Los valores numéricos no pueden ser negativos');
        return;
    }

    try {
        btnAgregar.disabled = true;
        btnAgregar.textContent = 'Guardando...';

        await apiFetch('/api/insumos', {
            method: 'POST',
            body: {
                nombre,
                unidad_medida,
                stock,
                stock_minimo,
                costo_unitario
            }
        });

        document.getElementById('nombre').value = '';
        document.getElementById('unidad_medida').value = '';
        document.getElementById('stock').value = '';
        document.getElementById('stock_minimo').value = '';
        document.getElementById('costo_unitario').value = '';

        await cargarInsumos();

        mostrarExito('Insumo agregado exitosamente');

    } catch (err) {
        mostrarError(err.message);
    } finally {
        btnAgregar.disabled = false;
        btnAgregar.textContent = 'Agregar Insumo';
    }
}

function abrirModalEditar(id) {
    const insumo = insumos.find(i => Number(i.id_insumo) === Number(id));

    if (!insumo) {
        mostrarError('Insumo no encontrado');
        return;
    }

    document.getElementById('editId').value = insumo.id_insumo;
    document.getElementById('editNombre').value = insumo.nombre || '';
    document.getElementById('editUnidad').value = insumo.unidad_medida || 'unidad';
    document.getElementById('editStockMinimo').value = insumo.stock_minimo || 0;
    document.getElementById('editCosto').value = insumo.costo_unitario || 0;
    document.getElementById('editActivo').checked = insumo.activo == 1;

    document.getElementById('modalEditar').style.display = 'block';
}

async function actualizarInsumo() {
    const id = document.getElementById('editId').value;
    const nombre = document.getElementById('editNombre').value.trim();
    const unidad_medida = document.getElementById('editUnidad').value;
    const stock_minimo = parseFloat(document.getElementById('editStockMinimo').value || 0);
    const costo_unitario = parseFloat(document.getElementById('editCosto').value || 0);
    const activo = document.getElementById('editActivo').checked ? 1 : 0;

    if (!nombre) {
        mostrarError('Ingrese el nombre del insumo');
        return;
    }

    if (!unidad_medida) {
        mostrarError('Seleccione una unidad de medida');
        return;
    }

    if (stock_minimo < 0 || costo_unitario < 0) {
        mostrarError('Los valores numéricos no pueden ser negativos');
        return;
    }

    try {
        btnGuardar.disabled = true;
        btnGuardar.textContent = 'Guardando...';

        await apiFetch(`/api/insumos/${id}`, {
            method: 'PUT',
            body: {
                nombre,
                unidad_medida,
                stock_minimo,
                costo_unitario,
                activo
            }
        });

        cerrarModal();
        await cargarInsumos();

        mostrarExito('Insumo actualizado exitosamente');

    } catch (err) {
        mostrarError(err.message);
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar';
    }
}

function abrirModalStock(id) {
    const insumo = insumos.find(i => Number(i.id_insumo) === Number(id));

    if (!insumo) {
        mostrarError('Insumo no encontrado');
        return;
    }

    document.getElementById('stockId').value = insumo.id_insumo;
    document.getElementById('stockNombre').textContent =
        `${insumo.nombre} | Stock actual: ${Number(insumo.stock || 0).toFixed(2)} ${insumo.unidad_medida}`;

    document.getElementById('tipoMovimiento').value = 'entrada';
    document.getElementById('cantidadMovimiento').value = '';
    document.getElementById('motivoMovimiento').value = '';

    document.getElementById('modalStock').style.display = 'block';
}

async function guardarMovimientoStock() {
    const id = document.getElementById('stockId').value;
    const tipo_movimiento = document.getElementById('tipoMovimiento').value;
    const cantidad = parseFloat(document.getElementById('cantidadMovimiento').value);
    const motivo = document.getElementById('motivoMovimiento').value.trim();

    if (!tipo_movimiento) {
        mostrarError('Seleccione un tipo de movimiento');
        return;
    }

    if (isNaN(cantidad) || cantidad < 0) {
        mostrarError('Ingrese una cantidad válida');
        return;
    }

    if ((tipo_movimiento === 'entrada' || tipo_movimiento === 'salida') && cantidad <= 0) {
        mostrarError('La cantidad debe ser mayor a 0');
        return;
    }

    try {
        btnGuardarStock.disabled = true;
        btnGuardarStock.textContent = 'Guardando...';

        await apiFetch(`/api/insumos/${id}/stock`, {
            method: 'PATCH',
            body: {
                tipo_movimiento,
                cantidad,
                motivo
            }
        });

        cerrarModal();
        await cargarInsumos();

        mostrarExito('Stock actualizado exitosamente');

    } catch (err) {
        mostrarError(err.message);
    } finally {
        btnGuardarStock.disabled = false;
        btnGuardarStock.textContent = 'Guardar Movimiento';
    }
}

async function desactivarInsumo(id) {
    if (!confirm('¿Desea desactivar este insumo?')) {
        return;
    }

    try {
        await apiFetch(`/api/insumos/${id}`, {
            method: 'DELETE'
        });

        await cargarInsumos();

        mostrarExito('Insumo desactivado');

    } catch (err) {
        mostrarError(err.message);
    }
}

function buscarInsumo() {
    filtroActual = document.getElementById('busqueda').value.trim().toLowerCase();
    aplicarFiltro();
}

function aplicarFiltro() {
    if (!filtroActual) {
        renderizarTabla(insumos);
        return;
    }

    const filtrados = insumos.filter(insumo => {
        return String(insumo.nombre || '').toLowerCase().includes(filtroActual) ||
               String(insumo.unidad_medida || '').toLowerCase().includes(filtroActual) ||
               String(insumo.estado_stock || '').toLowerCase().includes(filtroActual);
    });

    renderizarTabla(filtrados);
}

document.addEventListener('DOMContentLoaded', () => {
    const empleado = verificarSesion();

    if (!empleado) {
        return;
    }

    cargarInsumos();

    btnAgregar.addEventListener('click', crearInsumo);
    btnGuardar.addEventListener('click', actualizarInsumo);
    btnGuardarStock.addEventListener('click', guardarMovimientoStock);
});