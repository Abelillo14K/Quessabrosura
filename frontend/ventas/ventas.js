let ventas = [];
const tabla = document.getElementById('tabla');
const mensaje = document.getElementById('mensaje');

function getMethodClass(metodo) {
    const methodMap = {
        'Efectivo': 'efectivo',
        'Tarjeta': 'tarjeta',
        'Transferencia': 'transferencia'
    };
    return methodMap[metodo] || 'efectivo';
}

function cargarVentas() {
    fetch('http://localhost:3000/ventas')
        .then(res => res.json())
        .then(data => {
            ventas = data;
            renderizarTabla(data);
            actualizarResumen(data);
        })
        .catch(err => {
            console.error('Error al cargar ventas:', err);
            mostrarMensaje('Error al cargar datos', 'error');
        });
}

function renderizarTabla(data) {
    tabla.innerHTML = '';

    if (data.length === 0) {
        tabla.innerHTML = `
            <tr class="empty-row">
                <td colspan="6">No hay ventas registradas</td>
            </tr>
        `;
        return;
    }

    data.forEach(v => {
        tabla.innerHTML += `
            <tr>
                <td><strong>#${v.id_venta}</strong></td>
                <td>${v.fecha}</td>
                <td>${v.hora || 'N/A'}</td>
                <td class="total-cell">Q${parseFloat(v.total).toFixed(2)}</td>
                <td><span class="method-badge ${getMethodClass(v.metodo_pago)}">${v.metodo_pago}</span></td>
                <td>${v.id_empleado || 'N/A'}</td>
            </tr>
        `;
    });
}

function actualizarResumen(data) {
    const hoy = new Date().toISOString().split('T')[0];
    
    const ventasDeHoy = data.filter(v => v.fecha === hoy);
    
    let totalHoy = 0;
    let totalEfectivo = 0;
    let totalTarjeta = 0;

    data.forEach(v => {
        const monto = parseFloat(v.total);
        
        if (v.fecha === hoy) {
            totalHoy += monto;
        }
        
        if (v.metodo_pago === 'Efectivo') {
            totalEfectivo += monto;
        } else if (v.metodo_pago === 'Tarjeta') {
            totalTarjeta += monto;
        }
    });

    document.getElementById('ventasHoy').textContent = `Q${totalHoy.toFixed(2)}`;
    document.getElementById('totalTransacciones').textContent = data.length.toString();
    document.getElementById('efectivoTotal').textContent = `Q${totalEfectivo.toFixed(2)}`;
    document.getElementById('tarjetaTotal').textContent = `Q${totalTarjeta.toFixed(2)}`;
}

function filtrarVentas() {
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;
    const metodo = document.getElementById('filtroMetodo').value;

    let filtradas = [...ventas];

    if (fechaInicio) {
        filtradas = filtradas.filter(v => v.fecha >= fechaInicio);
    }

    if (fechaFin) {
        filtradas = filtradas.filter(v => v.fecha <= fechaFin);
    }

    if (metodo) {
        filtradas = filtradas.filter(v => v.metodo_pago === metodo);
    }

    renderizarTabla(filtradas);
    actualizarResumen(filtradas);
}

function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = `mensaje ${tipo} show`;
    
    setTimeout(() => {
        mensaje.classList.remove('show');
    }, 3000);
}

const fechaHoy = new Date().toISOString().split('T')[0];
document.getElementById('fechaInicio').value = fechaHoy;
document.getElementById('fechaFin').value = fechaHoy;

cargarVentas();