let productos = [];
let insumos = [];
let recetaActual = [];
let recetasTodas = [];
let idProductoSeleccionado = null;
let filtroActual = '';

const selectProducto = document.getElementById('producto');
const selectInsumo = document.getElementById('insumo');
const tablaReceta = document.getElementById('tablaReceta');
const tablaTodas = document.getElementById('tablaTodas');

const btnCargarReceta = document.getElementById('btnCargarReceta');
const btnAgregarInsumo = document.getElementById('btnAgregarInsumo');
const btnGuardarReceta = document.getElementById('btnGuardarReceta');

async function cargarProductos() {
    try {
        productos = await apiFetch('/api/productos');

        selectProducto.innerHTML = '<option value="">Seleccione un producto...</option>';

        productos.forEach(producto => {
            if (producto.activo != 0) {
                selectProducto.innerHTML += `
                    <option value="${producto.id_producto}">
                        ${producto.nombre} (${producto.categoria})
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

        selectInsumo.innerHTML = '<option value="">Seleccione insumo...</option>';

        insumos.forEach(insumo => {
            if (insumo.activo != 0) {
                selectInsumo.innerHTML += `
                    <option 
                        value="${insumo.id_insumo}"
                        data-unidad="${insumo.unidad_medida}"
                        data-stock="${insumo.stock}"
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

async function cargarTodasLasRecetas() {
    try {
        recetasTodas = await apiFetch('/api/recetas');
        aplicarFiltroTodas();

    } catch (err) {
        tablaTodas.innerHTML = `
            <tr class="empty-row">
                <td colspan="5">No se pudieron cargar las recetas</td>
            </tr>
        `;
        mostrarError(err.message);
    }
}

async function cargarRecetaProducto() {
    const idProducto = parseInt(selectProducto.value);

    if (!idProducto) {
        mostrarError('Seleccione un producto');
        return;
    }

    try {
        const data = await apiFetch(`/api/recetas/${idProducto}`);

        idProductoSeleccionado = idProducto;
        recetaActual = data.receta.map(item => ({
            id_insumo: item.id_insumo,
            insumo: item.insumo,
            unidad_medida: item.unidad_medida,
            stock: item.stock,
            cantidad_usada: Number(item.cantidad_usada)
        }));

        document.getElementById('sectionProducto').style.display = 'block';
        document.getElementById('productoTitulo').textContent = `Receta: ${data.producto.nombre}`;
        document.getElementById('productoDescripcion').textContent =
            `${data.producto.categoria} | Precio: ${formatearMoneda(data.producto.precio_venta)} | ${data.producto.descripcion || 'Sin descripción'}`;

        renderizarRecetaActual();

    } catch (err) {
        mostrarError(err.message);
    }
}

function agregarInsumoReceta() {
    const idInsumo = parseInt(selectInsumo.value);
    const cantidad = parseFloat(document.getElementById('cantidad').value);

    if (!idProductoSeleccionado) {
        mostrarError('Primero cargue un producto');
        return;
    }

    if (!idInsumo) {
        mostrarError('Seleccione un insumo');
        return;
    }

    if (isNaN(cantidad) || cantidad <= 0) {
        mostrarError('Ingrese una cantidad mayor a 0');
        return;
    }

    const existe = recetaActual.find(item => Number(item.id_insumo) === Number(idInsumo));

    if (existe) {
        mostrarError('Este insumo ya fue agregado a la receta');
        return;
    }

    const insumo = insumos.find(i => Number(i.id_insumo) === Number(idInsumo));

    if (!insumo) {
        mostrarError('Insumo no encontrado');
        return;
    }

    recetaActual.push({
        id_insumo: insumo.id_insumo,
        insumo: insumo.nombre,
        unidad_medida: insumo.unidad_medida,
        stock: insumo.stock,
        cantidad_usada: cantidad
    });

    selectInsumo.value = '';
    document.getElementById('cantidad').value = '';

    renderizarRecetaActual();
}

function renderizarRecetaActual() {
    tablaReceta.innerHTML = '';

    if (!recetaActual || recetaActual.length === 0) {
        tablaReceta.innerHTML = `
            <tr class="empty-row">
                <td colspan="5">No hay insumos en esta receta</td>
            </tr>
        `;
        return;
    }

    recetaActual.forEach((item, index) => {
        tablaReceta.innerHTML += `
            <tr>
                <td><strong>${item.insumo}</strong></td>
                <td>${Number(item.cantidad_usada).toFixed(2)}</td>
                <td>${item.unidad_medida}</td>
                <td>${Number(item.stock || 0).toFixed(2)}</td>
                <td>
                    <button class="btn-delete" onclick="eliminarInsumoReceta(${index})">
                        Eliminar
                    </button>
                </td>
            </tr>
        `;
    });
}

function eliminarInsumoReceta(index) {
    recetaActual.splice(index, 1);
    renderizarRecetaActual();
}

async function guardarReceta() {
    if (!idProductoSeleccionado) {
        mostrarError('Seleccione y cargue un producto');
        return;
    }

    if (recetaActual.length === 0) {
        mostrarError('Debe agregar al menos un insumo');
        return;
    }

    try {
        btnGuardarReceta.disabled = true;
        btnGuardarReceta.textContent = 'Guardando...';

        await apiFetch(`/api/recetas/${idProductoSeleccionado}`, {
            method: 'POST',
            body: {
                insumos: recetaActual.map(item => ({
                    id_insumo: item.id_insumo,
                    cantidad_usada: item.cantidad_usada
                }))
            }
        });

        await cargarRecetaProducto();
        await cargarTodasLasRecetas();

        mostrarExito('Receta guardada correctamente');

    } catch (err) {
        mostrarError(err.message);
    } finally {
        btnGuardarReceta.disabled = false;
        btnGuardarReceta.textContent = 'Guardar Receta';
    }
}

function renderizarTodasLasRecetas(data) {
    tablaTodas.innerHTML = '';

    if (!data || data.length === 0) {
        tablaTodas.innerHTML = `
            <tr class="empty-row">
                <td colspan="5">No hay recetas registradas</td>
            </tr>
        `;
        return;
    }

    data.forEach(item => {
        tablaTodas.innerHTML += `
            <tr>
                <td><strong>${item.producto}</strong></td>
                <td>${item.categoria}</td>
                <td>${item.insumo}</td>
                <td>${Number(item.cantidad_usada).toFixed(2)}</td>
                <td>${item.unidad_medida}</td>
            </tr>
        `;
    });
}

function buscarRecetas() {
    filtroActual = document.getElementById('busqueda').value.trim().toLowerCase();
    aplicarFiltroTodas();
}

function aplicarFiltroTodas() {
    if (!filtroActual) {
        renderizarTodasLasRecetas(recetasTodas);
        return;
    }

    const filtradas = recetasTodas.filter(item => {
        return String(item.producto || '').toLowerCase().includes(filtroActual) ||
               String(item.categoria || '').toLowerCase().includes(filtroActual) ||
               String(item.insumo || '').toLowerCase().includes(filtroActual);
    });

    renderizarTodasLasRecetas(filtradas);
}

document.addEventListener('DOMContentLoaded', async () => {
    const empleado = verificarSesion();

    if (!empleado) {
        return;
    }

    await cargarProductos();
    await cargarInsumos();
    await cargarTodasLasRecetas();

    btnCargarReceta.addEventListener('click', cargarRecetaProducto);
    btnAgregarInsumo.addEventListener('click', agregarInsumoReceta);
    btnGuardarReceta.addEventListener('click', guardarReceta);
});