let productos = [];

const lista = document.getElementById('lista');
const historial = document.getElementById('historial');
const mensaje = document.getElementById('mensaje');
const totalCarrito = document.getElementById('totalCarrito');

function agregar() {
    const id_producto = document.getElementById('producto').value;
    const cantidad = document.getElementById('cantidad').value;
    const precio = parseFloat(document.getElementById('precio').value);

    if (!id_producto || !cantidad || !precio) {
        mostrarMensaje('Por favor complete todos los campos', 'error');
        return;
    }

    productos.push({
        id_producto: parseInt(id_producto),
        cantidad: parseInt(cantidad),
        precio: precio
    });

    document.getElementById('producto').value = '';
    document.getElementById('cantidad').value = '';
    document.getElementById('precio').value = '';

    mostrarLista();
    mostrarMensaje('Producto agregado', 'exito');
}

function mostrarLista() {
    lista.innerHTML = '';

    if (productos.length === 0) {
        lista.innerHTML = `
            <tr class="empty-row">
                <td colspan="5">No hay productos agregados</td>
            </tr>
        `;
        totalCarrito.textContent = 'Q0.00';
        return;
    }

    let total = 0;

    productos.forEach((p, index) => {
        const subtotal = p.cantidad * p.precio;
        total += subtotal;

        lista.innerHTML += `
            <tr>
                <td>${p.id_producto}</td>
                <td>${p.cantidad}</td>
                <td>Q${p.precio.toFixed(2)}</td>
                <td>Q${subtotal.toFixed(2)}</td>
                <td>
                    <button class="btn-delete" onclick="eliminarProducto(${index})">Eliminar</button>
                </td>
            </tr>
        `;
    });

    totalCarrito.textContent = `Q${total.toFixed(2)}`;
}

function eliminarProducto(index) {
    productos.splice(index, 1);
    mostrarLista();
    mostrarMensaje('Producto eliminado', 'exito');
}

function limpiarCarrito() {
    productos = [];
    mostrarLista();
    mostrarMensaje('Carrito limpiado', 'exito');
}

function guardarCompra() {
    if (productos.length === 0) {
        mostrarMensaje('No hay productos para guardar', 'error');
        return;
    }

    fetch('http://localhost:3000/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productos })
    })
    .then(res => {
        if (res.ok) {
            productos = [];
            mostrarLista();
            cargarHistorial();
            mostrarMensaje('Compra guardada exitosamente', 'exito');
        } else {
            mostrarMensaje('Error al guardar la compra', 'error');
        }
    })
    .catch(err => {
        mostrarMensaje('Error de conexión', 'error');
    });
}

function cargarHistorial() {
    fetch('http://localhost:3000/compras')
        .then(res => res.json())
        .then(data => {
            historial.innerHTML = '';

            if (data.length === 0) {
                historial.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align: center; color: #999; font-style: italic; padding: 30px;">
                            No hay compras registradas
                        </td>
                    </tr>
                `;
                return;
            }

            data.forEach(c => {
                historial.innerHTML += `
                    <tr>
                        <td>#${c.id_compra}</td>
                        <td>${c.fecha}</td>
                        <td>Q${parseFloat(c.total).toFixed(2)}</td>
                        <td><span class="status">Completada</span></td>
                    </tr>
                `;
            });
        });
}

function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = `mensaje ${tipo} show`;

    setTimeout(() => {
        mensaje.classList.remove('show');
    }, 3000);
}

cargarHistorial();