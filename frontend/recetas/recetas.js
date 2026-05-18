let productos = [];
let insumos = [];
let recetaActual = [];
let recetasTodas = [];
let recetasAgrupadas = [];
let idProductoSeleccionado = null;
let filtroActual = '';

const selectProducto = document.getElementById('producto');
const selectInsumo = document.getElementById('insumo');
const tablaReceta = document.getElementById('tablaReceta');
const resumenRecetas = document.getElementById('resumenRecetas');

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
        recetasAgrupadas = agruparRecetasPorProducto(recetasTodas);
        aplicarFiltroTodas();

    } catch (err) {
        resumenRecetas.innerHTML = `
            <div class="empty-card">
                No se pudieron cargar las recetas
            </div>
        `;
        mostrarError(err.message);
    }
}

function agruparRecetasPorProducto(lista) {
    const mapa = {};

    lista.forEach(item => {
        const idProducto = item.id_producto;

        if (!mapa[idProducto]) {
            mapa[idProducto] = {
                id_producto: item.id_producto,
                producto: item.producto,
                categoria: item.categoria,
                ingredientes: []
            };
        }

        mapa[idProducto].ingredientes.push({
            id_receta: item.id_receta,
            id_insumo: item.id_insumo,
            insumo: item.insumo,
            cantidad_usada: item.cantidad_usada,
            unidad_medida: item.unidad_medida
        });
    });

    return Object.values(mapa);
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
                <td>
                    <strong>${item.insumo}</strong>
                </td>

                <td>
                    ${Number(item.cantidad_usada || 0).toFixed(2)}
                </td>

                <td>
                    ${item.unidad_medida || 'N/A'}
                </td>

                <td>
                    ${Number(item.stock || 0).toFixed(2)}
                </td>

                <td>
                    <button class="btn-delete" onclick="eliminarInsumoReceta(${index})">
                        Eliminar
                    </button>
                </td>
            </tr>
        `;
    });
}

function renderizarResumenRecetas(data) {
    resumenRecetas.innerHTML = '';

    if (!data || data.length === 0) {
        resumenRecetas.innerHTML = `
            <div class="empty-card">
                No hay recetas registradas
            </div>
        `;
        return;
    }

    resumenRecetas.innerHTML = `
        <div class="tabla-recetas-wrapper">
            <table class="tabla-recetas">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Categoría</th>
                        <th>Ingredientes</th>
                        <th>Ver receta</th>
                    </tr>
                </thead>
                <tbody id="tablaResumenRecetas"></tbody>
            </table>
        </div>
    `;

    const tablaResumen = document.getElementById('tablaResumenRecetas');

    data.forEach(receta => {
        const ingredientesHtml = receta.ingredientes.map(item => {
            return `
                <li>
                    <span>${item.insumo}</span>
                    <strong>${Number(item.cantidad_usada).toFixed(2)} ${item.unidad_medida}</strong>
                </li>
            `;
        }).join('');

        tablaResumen.innerHTML += `
            <tr>
                <td>
                    <strong>${receta.producto}</strong>
                </td>

                <td>
                    <span class="categoria-receta">${receta.categoria}</span>
                </td>

                <td>
                    <span class="ingredientes-count">${receta.ingredientes.length} ingrediente(s)</span>
                </td>

                <td class="columna-ojo">
                    <div class="contenedor-ojo">
                        <button type="button" class="btn-ojo" aria-label="Ver receta">🌮</button>

                        <div class="popup-receta">
                            <div class="popup-titulo">
                                <strong>${receta.producto}</strong>
                                <span>${receta.categoria}</span>
                            </div>

                            <ul>
                                ${ingredientesHtml}
                            </ul>
                        </div>
                    </div>
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

function buscarRecetas() {
    filtroActual = document.getElementById('busqueda').value.trim().toLowerCase();
    aplicarFiltroTodas();
}

function aplicarFiltroTodas() {
    if (!filtroActual) {
        renderizarResumenRecetas(recetasAgrupadas);
        return;
    }

    const filtradas = recetasAgrupadas.filter(receta => {
        const coincideProducto = String(receta.producto || '').toLowerCase().includes(filtroActual);
        const coincideCategoria = String(receta.categoria || '').toLowerCase().includes(filtroActual);

        const coincideIngrediente = receta.ingredientes.some(item => {
            return String(item.insumo || '').toLowerCase().includes(filtroActual);
        });

        return coincideProducto || coincideCategoria || coincideIngrediente;
    });

    renderizarResumenRecetas(filtradas);
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