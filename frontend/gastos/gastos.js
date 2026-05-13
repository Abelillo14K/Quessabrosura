let gastos = [];
const tabla = document.getElementById('tabla');

async function cargarResumen() {
    try {
        const data = await apiFetch('/api/gastos/resumen');
        document.getElementById('gastosHoy').textContent = formatearMoneda(data.hoy);
        document.getElementById('gastosMes').textContent = formatearMoneda(data.mes);
    } catch (err) {
        console.error('Error al cargar resumen:', err);
    }
}

async function cargarGastos() {
    try {
        gastos = await apiFetch('/api/gastos');
        aplicarFiltros();
        actualizarTotal();
    } catch (err) {
        mostrarError(err.message);
    }
}

function aplicarFiltros() {
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;
    const busqueda = document.getElementById('busqueda').value.toLowerCase();

    let filtradas = [...gastos];

    if (fechaInicio) filtradas = filtradas.filter(g => g.fecha >= fechaInicio);
    if (fechaFin) filtradas = filtradas.filter(g => g.fecha <= fechaFin);
    if (busqueda) {
        filtradas = filtradas.filter(g =>
            g.descripcion.toLowerCase().includes(busqueda)
        );
    }

    renderizarTabla(filtradas);
}

function renderizarTabla(data) {
    tabla.innerHTML = '';

    if (data.length === 0) {
        tabla.innerHTML = '<tr class="empty-row"><td colspan="5">No hay gastos registrados</td></tr>';
        return;
    }

    let total = 0;

    data.forEach(g => {
        total += parseFloat(g.monto);
        tabla.innerHTML += `
            <tr>
                <td>${g.id_gasto}</td>
                <td>${g.fecha}</td>
                <td><strong>${g.descripcion}</strong></td>
                <td class="monto-cell">${formatearMoneda(g.monto)}</td>
                <td><button class="btn-delete" onclick="anularGasto(${g.id_gasto})">Anular</button></td>
            </tr>
        `;
    });

    document.getElementById('totalMostrado').textContent = formatearMoneda(total);
}

function actualizarTotal() {
    let total = 0;
    gastos.forEach(g => { total += parseFloat(g.monto); });
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

    if (!monto || monto <= 0) {
        mostrarError('Ingrese un monto válido');
        return;
    }

    try {
        await apiFetch('/api/gastos', {
            method: 'POST',
            body: { descripcion, monto, fecha }
        });
        document.getElementById('descripcion').value = '';
        document.getElementById('monto').value = '';
        document.getElementById('fechaGasto').value = new Date().toISOString().split('T')[0];
        await cargarGastos();
        await cargarResumen();
        mostrarExito('Gasto registrado');
    } catch (err) {
        mostrarError(err.message);
    }
}

async function anularGasto(id) {
    if (!confirm(`¿Anular el gasto #${id}?`)) return;

    try {
        await apiFetch(`/api/gastos/${id}`, { method: 'DELETE' });
        await cargarGastos();
        await cargarResumen();
        mostrarExito(`Gasto #${id} anulado`);
    } catch (err) {
        mostrarError(err.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    verificarSesion();
    cargarResumen();
    cargarGastos();

    document.getElementById('fechaGasto').value = new Date().toISOString().split('T')[0];
    document.getElementById('btnRegistrar').addEventListener('click', guardarGasto);
});
