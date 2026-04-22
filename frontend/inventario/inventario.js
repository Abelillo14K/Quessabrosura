let productos = [];
let inventario = [];
const tabla = document.getElementById('tabla');
const mensaje = document.getElementById('mensaje');

function getStockClass(cantidad) {
    if (cantidad <= 0) return 'stock-agotado';
    if (cantidad < 5) return 'stock-bajo';
    return 'stock-normal';
}

function cargarProductos() {
    fetch(`${window.location.origin}/api/productos`)
        .then(res => res.json())
        .then(data => {
            productos = data;
            const select = document.getElementById('producto');
            select.innerHTML = '<option value="">Seleccionar producto...</option>';
            data.forEach(p => {
                select.innerHTML += `<option value="${p.id_producto}">${p.nombre}</option>`;
            });
        })
        .catch(err => console.error('Error:', err));
}

function cargarInventario() {
    fetch(`${window.location.origin}/api/inventario`)
        .then(res => res.json())
        .then(data => {
            inventario = data;
            renderizarTabla(data);
        })
        .catch(err => mostrarMensaje('Error de conexión', 'error'));
}

function renderizarTabla(data) {
    tabla.innerHTML = '';

    if (data.length === 0) {
        tabla.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #999; font-style: italic; padding: 30px;">
                    No hay productos en inventario
                </td>
            </tr>
        `;
        return;
    }

    data.forEach(p => {
        tabla.innerHTML += `
            <tr>
                <td>${p.id_producto}</td>
                <td><strong>${p.nombre}</strong></td>
                <td>${p.tipo || 'N/A'}</td>
                <td>Q${p.precio_venta ? parseFloat(p.precio_venta).toFixed(2) : '0.00'}</td>
                <td><span class="stock-badge ${getStockClass(p.cantidad)}">${p.cantidad}</span></td>
                <td>
                    <button class="btn-edit" onclick="abrirModal(${p.id_producto})">✏️ Ajustar</button>
                </td>
            </tr>
        `;
    });
}

function guardarInventario() {
    const id_producto = parseInt(document.getElementById('producto').value);
    const cantidad = parseInt(document.getElementById('cantidad').value);

    if (!id_producto || isNaN(cantidad)) {
        mostrarMensaje('Seleccione producto y cantidad', 'error');
        return;
    }

    fetch(`${window.location.origin}/api/inventario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_producto, cantidad })
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById('inventarioForm').reset();
        cargarInventario();
        cargarProductos();
        mostrarMensaje('Inventario actualizado', 'exito');
    })
    .catch(err => mostrarMensaje('Error de conexión', 'error'));
}

function abrirModal(id) {
    const producto = inventario.find(p => p.id_producto === id);
    if (!producto) return;

    document.getElementById('editId').value = id;
    document.getElementById('editCantidad').value = producto.cantidad || 0;
    document.getElementById('modalEditar').style.display = 'block';
}

function cerrarModal() {
    document.getElementById('modalEditar').style.display = 'none';
}

function ajustarInventario() {
    const id_producto = document.getElementById('editId').value;
    const cantidad = parseInt(document.getElementById('editCantidad').value);

    fetch(`${window.location.origin}/api/inventario/${id_producto}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantidad })
    })
    .then(res => res.json())
    .then(data => {
        cerrarModal();
        cargarInventario();
        mostrarMensaje('Inventario actualizado', 'exito');
    })
    .catch(err => mostrarMensaje('Error de conexión', 'error'));
}

function buscarInventario() {
    const busqueda = document.getElementById('busqueda').value.toLowerCase();
    
    const filtrados = inventario.filter(p => 
        p.nombre.toLowerCase().includes(busqueda) ||
        (p.tipo && p.tipo.toLowerCase().includes(busqueda))
    );
    
    renderizarTabla(filtrados);
}

function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = `mensaje ${tipo} show`;
    
    setTimeout(() => {
        mensaje.classList.remove('show');
    }, 3000);
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        cerrarModal();
    }
};

function cerrarSesion() {
    sessionStorage.removeItem('empleado');
    window.location.href = '../login/login.html';
}

cargarProductos();
cargarInventario();