let cortes = [];
let resumenDia = null;

const tabla = document.getElementById('tabla');
const btnRegistrar = document.getElementById('btnRegistrar');

async function cargarResumen() {
    try {
        resumenDia = await apiFetch('/api/cortes/resumen');
        actualizarResumenUI(resumenDia);
    } catch (err) {
        mostrarError(err.message);
    }
}

function actualizarResumenUI(data) {
    const ventas = data.ventas || {};
    const totalVentas = parseFloat(ventas.total_ventas || 0);
    const efectivo = parseFloat(ventas.efectivo || 0);
    const transferencia = parseFloat(ventas.transferencia || 0);
    const cantidadVentas = ventas.cantidad_ventas || 0;
    const totalGastos = parseFloat(data.gastos || 0);
    const tieneCorte = data.tiene_corte;
    const corte = data.corte;

    document.getElementById('totalVentas').textContent = formatearMoneda(totalVentas);

    document.getElementById('ventasDetalle').textContent =
        `Efectivo: ${formatearMoneda(efectivo)} | Transferencia: ${formatearMoneda(transferencia)} (${cantidadVentas} ventas)`;

    document.getElementById('totalGastos').textContent = formatearMoneda(totalGastos);

    const esperadoNeto = totalVentas - totalGastos;
    document.getElementById('esperadoValor').textContent = formatearMoneda(esperadoNeto);

    const formSection = document.getElementById('formSection');
    const salidaValor = document.getElementById('salidaValor');
    const diferenciaValor = document.getElementById('diferenciaValor');

    if (tieneCorte && corte) {
        const totalEfectivo = parseFloat(corte.total_efectivo || 0);
        const totalTransferencia = parseFloat(corte.total_transferencia || 0);
        const totalGeneral = parseFloat(corte.total_general || 0);

        salidaValor.textContent = formatearMoneda(totalGeneral);

        const diferenciaGeneral = totalGeneral - esperadoNeto;

        diferenciaValor.textContent = `${diferenciaGeneral >= 0 ? '+' : ''}${formatearMoneda(diferenciaGeneral)}`;
        diferenciaValor.className = `summary-value ${
            diferenciaGeneral === 0 ? '' : diferenciaGeneral > 0 ? 'diff-positiva' : 'diff-negativa'
        }`;

        formSection.style.display = 'none';
    } else {
        salidaValor.textContent = 'Pendiente';
        diferenciaValor.textContent = 'Pendiente';
        diferenciaValor.className = 'summary-value';
        formSection.style.display = 'block';
    }
}

async function cargarCortes() {
    try {
        cortes = await apiFetch('/api/cortes');
        aplicarFiltros();
    } catch (err) {
        tabla.innerHTML = `
            <tr class="empty-row">
                <td colspan="7">No se pudo cargar el historial de cortes</td>
            </tr>
        `;
        mostrarError(err.message);
    }
}

function aplicarFiltros() {
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;
    const busqueda = document.getElementById('busqueda').value.trim().toLowerCase();

    let filtradas = [...cortes];

    if (fechaInicio) {
        filtradas = filtradas.filter(corte => {
            return String(corte.fecha).slice(0, 10) >= fechaInicio;
        });
    }

    if (fechaFin) {
        filtradas = filtradas.filter(corte => {
            return String(corte.fecha).slice(0, 10) <= fechaFin;
        });
    }

    if (busqueda) {
        filtradas = filtradas.filter(corte => {
            return String(corte.id_corte).includes(busqueda);
        });
    }

    renderizarTabla(filtradas);
}

function renderizarTabla(data) {
    tabla.innerHTML = '';

    if (data.length === 0) {
        tabla.innerHTML = `
            <tr class="empty-row">
                <td colspan="7">No hay cortes registrados</td>
            </tr>
        `;
        return;
    }

    data.forEach(corte => {
        const efectivo = parseFloat(corte.total_efectivo || 0);
        const transferencia = parseFloat(corte.total_transferencia || 0);
        const general = parseFloat(corte.total_general || 0);
        const estaAnulado = corte.anulada == 1;

        tabla.innerHTML += `
            <tr class="${estaAnulado ? 'row-anulada' : ''}">
                <td>#${corte.id_corte}</td>
                <td>${formatearFecha(corte.fecha)}</td>
                <td>${formatearMoneda(efectivo)}</td>
                <td>${formatearMoneda(transferencia)}</td>
                <td>${formatearMoneda(general)}</td>
                <td>
                    <span class="status ${estaAnulado ? 'status-anulada' : 'status-activa'}">
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

function filtrarCortes() {
    aplicarFiltros();
}

async function registrarCorte() {
    const efectivoInput = parseFloat(document.getElementById('total_efectivo').value || 0);
    const transferenciaInput = parseFloat(document.getElementById('total_transferencia').value || 0);

    if (isNaN(efectivoInput) || efectivoInput < 0) {
        mostrarError('Ingrese un total en efectivo válido');
        return;
    }

    if (isNaN(transferenciaInput) || transferenciaInput < 0) {
        mostrarError('Ingrese un total en transferencia válido');
        return;
    }

    const totalGeneral = efectivoInput + transferenciaInput;

    try {
        btnRegistrar.disabled = true;
        btnRegistrar.textContent = 'Registrando...';

        const data = await apiFetch('/api/cortes', {
            method: 'POST',
            body: {
                total_efectivo: efectivoInput,
                total_transferencia: transferenciaInput,
                total_general: totalGeneral
            }
        });

        document.getElementById('total_efectivo').value = '';
        document.getElementById('total_transferencia').value = '';

        await cargarResumen();
        await cargarCortes();

        mostrarExito(`Corte #${data.id_corte} registrado`);

    } catch (err) {
        mostrarError(err.message);
    } finally {
        btnRegistrar.disabled = false;
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

        await cargarCortes();
        await cargarResumen();

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

    cargarResumen();
    cargarCortes();

    btnRegistrar.addEventListener('click', registrarCorte);
});