let cortes = [];
let resumenDia = null;
const tabla = document.getElementById('tabla');

async function cargarResumen() {
    try {
        resumenDia = await apiFetch('/api/cortes/resumen');
        actualizarResumenUI(resumenDia);
    } catch (err) {
        mostrarError(err.message);
    }
}

function actualizarResumenUI(data) {
    const v = data.ventas;
    const totalVentas = parseFloat(v.total_ventas);
    const efectivo = parseFloat(v.efectivo);
    const transferencia = parseFloat(v.transferencia);
    const totalGastos = parseFloat(data.gastos);
    const tieneCorte = data.tiene_corte;
    const corte = data.corte;

    document.getElementById('totalVentas').textContent = formatearMoneda(totalVentas);
    document.getElementById('ventasDetalle').textContent =
        `Efectivo: ${formatearMoneda(efectivo)} | Transferencia: ${formatearMoneda(transferencia)} (${v.cantidad_ventas} ventas)`;

    document.getElementById('totalGastos').textContent = formatearMoneda(totalGastos);

    const formSection = document.getElementById('formSection');

    if (tieneCorte && corte) {
        document.getElementById('entradaValor').textContent = formatearMoneda(0);
        document.getElementById('esperadoValor').textContent = formatearMoneda(totalVentas - totalGastos);

        const totalEfectivo = parseFloat(corte.total_efectivo);
        const totalTransferencia = parseFloat(corte.total_transferencia);
        const totalGeneral = parseFloat(corte.total_general);

        document.getElementById('salidaValor').textContent = formatearMoneda(totalGeneral);
        const difEfectivo = totalEfectivo - efectivo;
        const difTransferencia = totalTransferencia - transferencia;
        const difGeneral = totalGeneral - (totalVentas - totalGastos);

        let diffText = '';
        if (difEfectivo !== 0 || difTransferencia !== 0) {
            diffText = `Efectivo: ${difEfectivo >= 0 ? '+' : ''}${formatearMoneda(difEfectivo)} | Transferencia: ${difTransferencia >= 0 ? '+' : ''}${formatearMoneda(difTransferencia)}`;
        }

        const diffEl = document.getElementById('diferenciaValor');
        diffEl.textContent = `${difGeneral >= 0 ? '+' : ''}${formatearMoneda(difGeneral)}`;
        diffEl.className = `summary-value ${difGeneral === 0 ? '' : (difGeneral > 0 ? 'diff-positiva' : 'diff-negativa')}`;

        formSection.style.display = 'none';
    } else {
        document.getElementById('entradaValor').textContent = formatearMoneda(0);
        document.getElementById('esperadoValor').textContent = formatearMoneda(totalVentas - totalGastos);
        document.getElementById('salidaValor').textContent = 'Pendiente';
        document.getElementById('diferenciaValor').textContent = 'Pendiente';
        document.getElementById('diferenciaValor').className = 'summary-value';

        formSection.style.display = 'block';
    }
}

async function cargarCortes() {
    try {
        cortes = await apiFetch('/api/cortes');
        aplicarFiltros();
    } catch (err) {
        mostrarError(err.message);
    }
}

function aplicarFiltros() {
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;
    const busqueda = document.getElementById('busqueda').value.toLowerCase();

    let filtradas = [...cortes];

    if (fechaInicio) filtradas = filtradas.filter(c => c.fecha >= fechaInicio);
    if (fechaFin) filtradas = filtradas.filter(c => c.fecha <= fechaFin);

    renderizarTabla(filtradas);
}

function renderizarTabla(data) {
    tabla.innerHTML = '';

    if (data.length === 0) {
        tabla.innerHTML = '<tr class="empty-row"><td colspan="7">No hay cortes registrados</td></tr>';
        return;
    }

    data.forEach(c => {
        const efectivo = parseFloat(c.total_efectivo);
        const transferencia = parseFloat(c.total_transferencia);
        const general = parseFloat(c.total_general);

        tabla.innerHTML += `
            <tr>
                <td>${c.id_corte}</td>
                <td>${c.fecha}</td>
                <td>${formatearMoneda(efectivo)}</td>
                <td>${formatearMoneda(transferencia)}</td>
                <td>${formatearMoneda(general)}</td>
                <td>—</td>
                <td><button class="btn-delete" onclick="anularCorte(${c.id_corte})">Eliminar</button></td>
            </tr>
        `;
    });
}

function filtrarCortes() {
    aplicarFiltros();
}

async function registrarCorte() {
    const efectivoInput = parseFloat(document.getElementById('total_efectivo')?.value || 0);
    const transferenciaInput = parseFloat(document.getElementById('total_transferencia')?.value || 0);

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
    }
}

async function anularCorte(id) {
    if (!confirm(`¿Eliminar el corte #${id}?`)) return;

    try {
        await apiFetch(`/api/cortes/${id}`, { method: 'DELETE' });
        await cargarCortes();
        await cargarResumen();
        mostrarExito('Corte eliminado');
    } catch (err) {
        mostrarError(err.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    verificarSesion();
    cargarResumen();
    cargarCortes();

    document.getElementById('btnRegistrar').addEventListener('click', registrarCorte);
});
