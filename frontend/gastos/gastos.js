let gastos = [];

const tabla = document.getElementById('tabla');
const btnRegistrar = document.getElementById('btnRegistrar');

async function cargarResumen() {
    try {
        const data = await apiFetch('/api/gastos/resumen');

        document.getElementById('gastosHoy').textContent = formatearMoneda(data.hoy || 0);
        document.getElementById('gastosMes').textContent = formatearMoneda(data.mes || 0);

    } catch (err) {
        console.error('Error al cargar resumen:', err);
    }
}

async function cargarGastos() {
    try {
        gastos = await apiFetch('/api/gastos');
        aplicarFiltros();
        actualizarTotalGeneral();

    } catch (err) {
        tabla.innerHTML = `
            <tr class="empty-row">
                <td colspan="6">No se pudieron cargar los gastos</td>
            </tr>
        `;
        mostrarError(err.message);
    }
}

function aplicarFiltros() {
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;
    const busqueda = document.getElementById('busqueda').value.trim().toLowerCase();

    let filtradas = [...gastos];

    if (fechaInicio) {
        filtradas = filtradas.filter(gasto => {
            return String(gasto.fecha).slice(0, 10) >= fechaInicio;
        });
    }

    if (fechaFin) {
        filtradas = filtradas.filter(gasto => {
            return String(gasto.fecha).slice(0, 10) <= fechaFin;
        });
    }

    if (busqueda) {
        filtradas = filtradas.filter(gasto => {
            return String(gasto.descripcion || '').toLowerCase().includes(busqueda);
        });
    }

    renderizarTabla(filtradas);
}

function renderizarTabla(data) {
    tabla.innerHTML = '';

    if (!data || data.length === 0) {
        tabla.innerHTML = `
            <tr class="empty-row">
                <td colspan="6">No hay gastos registrados</td>
            </tr>
        `;

        document.getElementById('totalMostrado').textContent = 'Q0.00';
        return;
    }

    let totalMostrado = 0;

    data.forEach(gasto => {
        const monto = parseFloat(gasto.monto || 0);
        const estaAnulado = gasto.anulada == 1;

        if (!estaAnulado) {
            totalMostrado += monto;
        }

        tabla.innerHTML += `
            <tr class="${estaAnulado ? 'row-anulada' : ''}">
                <td>#${gasto.id_gasto}</td>
                <td>${formatearFecha(gasto.fecha)}</td>
                <td><strong>${gasto.descripcion}</strong></td>
                <td class="monto-cell">${formatearMoneda(monto)}</td>
                <td>
                    <span class="status ${estaAnulado ? 'status-anulado' : 'status-activo'}">
                        ${estaAnulado ? 'Anulado' : 'Activo'}
                    </span>
                </td>
                <td>
                    ${estaAnulado ? '—' : `
                        <button class="btn-delete" onclick="anularGasto(${gasto.id_gasto})">
                            Anular
                        </button>
                    `}
                </td>
            </tr>
        `;
    });

    document.getElementById('totalMostrado').textContent = formatearMoneda(totalMostrado);
}

function actualizarTotalGeneral() {
    let total = 0;

    gastos.forEach(gasto => {
        if (gasto.anulada != 1) {
            total += parseFloat(gasto.monto || 0);
        }
    });

    document.getElementById('totalGastos').textContent = formatearMoneda(total);
}

function filtrarGastos() {
    aplicarFiltros();
}

async function guardarGasto() {
    const descripcion = document.getElementById('descripcion').value.trim();
    const monto = parseFloat(document.getElementById('monto').value);
    const fecha = document.getElementById('fechaGasto').value || null;

    if (!descripcion) {
        mostrarError('Ingrese una descripción');
        return;
    }

    if (!monto || isNaN(monto) || monto <= 0) {
        mostrarError('Ingrese un monto válido');
        return;
    }

    try {
        btnRegistrar.disabled = true;
        btnRegistrar.textContent = 'Guardando...';

        await apiFetch('/api/gastos', {
            method: 'POST',
            body: {
                descripcion,
                monto,
                fecha
            }
        });

        document.getElementById('descripcion').value = '';
        document.getElementById('monto').value = '';
        document.getElementById('fechaGasto').value = obtenerFechaActual();

        await cargarGastos();
        await cargarResumen();

        mostrarExito('Gasto registrado');

    } catch (err) {
        mostrarError(err.message);
    } finally {
        btnRegistrar.disabled = false;
        btnRegistrar.textContent = 'Registrar';
    }
}

async function anularGasto(id) {
    if (!confirm(`¿Anular el gasto #${id}?`)) {
        return;
    }

    try {
        await apiFetch(`/api/gastos/${id}`, {
            method: 'DELETE'
        });

        await cargarGastos();
        await cargarResumen();

        mostrarExito(`Gasto #${id} anulado`);

    } catch (err) {
        mostrarError(err.message);
    }
}

function obtenerFechaActual() {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

document.addEventListener('DOMContentLoaded', () => {
    const empleado = verificarSesion();

    if (!empleado) {
        return;
    }

    document.getElementById('fechaGasto').value = obtenerFechaActual();

    cargarResumen();
    cargarGastos();

    btnRegistrar.addEventListener('click', guardarGasto);
});