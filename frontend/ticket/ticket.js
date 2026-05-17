function obtenerParametro(nombre) {
    const params = new URLSearchParams(window.location.search);
    return params.get(nombre);
}

function formatearMonedaLocal(valor) {
    return `Q${Number(valor || 0).toFixed(2)}`;
}

function formatearFechaLocal(fecha) {
    if (!fecha) {
        return 'N/A';
    }

    return String(fecha).slice(0, 10);
}

function volverVentas() {
    window.location.href = '../ventas/ventas.html';
}

async function cargarTicket() {
    const idVenta = obtenerParametro('id_venta');

    if (!idVenta) {
        alert('No se recibió el número de venta');
        volverVentas();
        return;
    }

    try {
        const data = await apiFetch(`/api/ventas/${idVenta}/ticket`);

        document.getElementById('negocioNombre').textContent = data.negocio.nombre || 'QUESSABROSURA';
        document.getElementById('negocioDireccion').textContent = data.negocio.direccion || '';
        document.getElementById('negocioTelefono').textContent = data.negocio.telefono || '';

        document.getElementById('numeroTicket').textContent = data.venta.numero_comprobante || `T-${String(data.venta.id_venta).padStart(6, '0')}`;
        document.getElementById('idVenta').textContent = `#${data.venta.id_venta}`;
        document.getElementById('fechaVenta').textContent = formatearFechaLocal(data.venta.fecha_solo || data.venta.fecha);
        document.getElementById('horaVenta').textContent = String(data.venta.hora_solo || '').slice(0, 5);
        document.getElementById('empleadoVenta').textContent = data.venta.empleado || 'N/A';
        document.getElementById('clienteVenta').textContent = data.venta.cliente || 'Consumidor final';
        document.getElementById('nitVenta').textContent = data.venta.nit || 'CF';
        document.getElementById('totalVenta').textContent = formatearMonedaLocal(data.venta.total);

        const detalleBody = document.getElementById('detalleTicket');
        detalleBody.innerHTML = '';

        if (!data.detalle || data.detalle.length === 0) {
            detalleBody.innerHTML = `
                <tr>
                    <td colspan="4">Sin detalle</td>
                </tr>
            `;
        } else {
            data.detalle.forEach(item => {
                detalleBody.innerHTML += `
                    <tr>
                        <td>
                            ${item.producto}
                            ${item.observacion ? `<br><small>${item.observacion}</small>` : ''}
                        </td>
                        <td>${item.cantidad}</td>
                        <td>${formatearMonedaLocal(item.precio_unitario)}</td>
                        <td>${formatearMonedaLocal(item.subtotal)}</td>
                    </tr>
                `;
            });
        }

        const pagosDiv = document.getElementById('pagosTicket');
        pagosDiv.innerHTML = '';

        if (!data.pagos || data.pagos.length === 0) {
            pagosDiv.innerHTML = '<p>Sin pagos registrados</p>';
        } else {
            data.pagos.forEach(pago => {
                pagosDiv.innerHTML += `
                    <p>
                        <strong>${pago.metodo_pago}:</strong>
                        ${formatearMonedaLocal(pago.monto)}
                        ${pago.referencia ? `<br><small>Ref: ${pago.referencia}</small>` : ''}
                    </p>
                `;
            });
        }

    } catch (err) {
        alert(err.message || 'No se pudo cargar el ticket');
        volverVentas();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const empleado = verificarSesion();

    if (!empleado) {
        return;
    }

    cargarTicket();
});