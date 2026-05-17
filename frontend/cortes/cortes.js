let cortes = [];

const tabla = document.getElementById('tabla');
const btnRegistrar = document.getElementById('btnRegistrar');

function obtenerFechaActual() {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

async function cargarResumen() {
    try {
        const data = await apiFetch('/api/cortes/resumen');

        document.getElementById('ventasDia').textContent = formatearMoneda(data.total_ventas || 0);
        document.getElementById('gastosDia').textContent = formatearMoneda(data.total_gastos || 0);
        document.getElementById('esperadoNeto').textContent = formatearMoneda(data.esperado_neto || 0);
        document.getElementById('efectivoSistema').textContent = formatearMoneda(data.total_efectivo || 0);
        document.getElementById('transferenciaSistema').textContent = formatearMoneda(data.total_transferencia || 0);
        document.getElementById('tarjetaSistema').textContent = formatearMoneda(data.total_tarjeta || 0);
        document.getElementById('desgloseVentas').textContent = `${data.cantidad_ventas || 0} ventas`;

        document.getElementById('totalEfectivo').value = Number(data.total_efectivo || 0).toFixed(2);
        document.getElementById('totalTransferencia').value = Number(data.total_transferencia || 0).toFixed(2);
        document.getElementById('totalTarjeta').value = Number(data.total_tarjeta || 0).toFixed(2);

        if (data.tiene_corte) {
            btnRegistrar.disabled = true;
            btnRegistrar.textContent = 'Corte ya registrado hoy';
        } else {
            btnRegistrar.disabled = false;
            btnRegistrar.textContent = 'Registrar Corte';
        }

    } catch (err) {
        mostrarError(err.message);
    }
}

async function cargarCortes() {
    try {
        cortes = await apiFetch('/api/cortes');
        filtrarCortes();

    } catch (err) {
        tabla.innerHTML = `
            <tr class="empty-row">
                <td colspan="10">No se pudieron cargar los cortes</td>
            </tr>
        `;
        mostrarError(err.message);
    }
}

function filtrarCortes() {
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;
    const busqueda = document.getElementById('busqueda').value.trim().toLowerCase();

    let filtrados = [...cortes];

    if (fechaInicio) {
        filtrados = filtrados.filter(corte => String(corte.fecha).slice(0, 10) >= fechaInicio);
    }

    if (fechaFin) {
        filtrados = filtrados.filter(corte => String(corte.fecha).slice(0, 10) <= fechaFin);
    }

    if (busqueda) {
        filtrados = filtrados.filter(corte => {
            return String(corte.id_corte).includes(busqueda) ||
                   String(corte.empleado || '').toLowerCase().includes(busqueda);
        });
    }

    renderizarTabla(filtrados);
}

function renderizarTabla(data) {
    tabla.innerHTML = '';

    if (!data || data.length === 0) {
        tabla.innerHTML = `
            <tr class="empty-row">
                <td colspan="10">No hay cortes registrados</td>
            </tr>
        `;
        return;
    }

    data.forEach(corte => {
        const estaAnulado = corte.anulada == 1;
        const diferencia = Number(corte.diferencia || 0);

        tabla.innerHTML += `
            <tr class="${estaAnulado ? 'row-anulada' : ''}">
                <td><strong>#${corte.id_corte}</strong></td>
                <td>${formatearFecha(corte.fecha)}</td>
                <td>${corte.hora ? String(corte.hora).slice(0, 5) : 'N/A'}</td>
                <td>${formatearMoneda(corte.total_ventas)}</td>
                <td>${formatearMoneda(corte.total_gastos)}</td>
                <td>${formatearMoneda(corte.total_general)}</td>
                <td class="${diferencia === 0 ? 'diferencia-ok' : 'diferencia-alerta'}">
                    ${formatearMoneda(diferencia)}
                </td>
                <td>${corte.empleado || '—'}</td>
                <td>
                    <span class="status ${estaAnulado ? 'status-anulado' : 'status-activo'}">
                        ${estaAnulado ? 'Anulado' : 'Activo'}
                    </span>
                </td>
                <td>
                    ${estaAnulado ? '—' : `
                        <button class="btn-delete" onclick="anularCorte(${corte.id_corte})">
                            Anular
                        </button>
                    `}
                </td>
            </tr>
        `;
    });
}

async function registrarCorte() {
    const totalEfectivo = parseFloat(document.getElementById('totalEfectivo').value || 0);
    const totalTransferencia = parseFloat(document.getElementById('totalTransferencia').value || 0);
    const totalTarjeta = parseFloat(document.getElementById('totalTarjeta').value || 0);

    if (totalEfectivo < 0 || totalTransferencia < 0 || totalTarjeta < 0) {
        mostrarError('Los valores no pueden ser negativos');
        return;
    }

    if (!confirm('¿Registrar corte de caja del día?')) {
        return;
    }

    try {
        btnRegistrar.disabled = true;
        btnRegistrar.textContent = 'Registrando...';

        const data = await apiFetch('/api/cortes', {
            method: 'POST',
            body: {
                total_efectivo: totalEfectivo,
                total_transferencia: totalTransferencia,
                total_tarjeta: totalTarjeta
            }
        });

        await cargarResumen();
        await cargarCortes();

        mostrarExito(`Corte #${data.id_corte} registrado. Diferencia: ${formatearMoneda(data.diferencia)}`);

    } catch (err) {
        mostrarError(err.message);
    } finally {
        btnRegistrar.textContent = 'Registrar Corte';
    }
}

async function anularCorte(id) {
    if (!confirm(`¿Anular el corte #${id}?`)) {
        return;
    }

    try {
        await apiFetch(`/api/cortes/${id}`, {
            method: 'DELETE'
        });

        await cargarResumen();
        await cargarCortes();

        mostrarExito(`Corte #${id} anulado`);

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

    cargarResumen();
    cargarCortes();

    btnRegistrar.addEventListener('click', registrarCorte);
});