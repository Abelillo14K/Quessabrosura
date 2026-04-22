let productos = [];
const tabla = document.getElementById('tabla');
const mensaje = document.getElementById('mensaje');

function getActivoClass(activo) {
    return activo == 1 ? 'activo' : 'inactivo';
}

function getActivoTexto(activo) {
    return activo == 1 ? 'Activo' : 'Inactivo';
}

function cargarProductos() {
    fetch(`${window.location.origin}/api/productos`)
        .then(res => res.json())
        .then(data => {
            productos = data;
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
                    No hay productos registrados
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
                <td><span class="stock-badge ${getActivoClass(p.activo)}">${getActivoTexto(p.activo)}</span></td>
                <td>
                    <button class="btn-edit" onclick="abrirModal(${p.id_producto})">✏️ Editar</button>
                    <button class="btn-toggle" onclick="toggleActivo(${p.id_producto}, ${p.activo})">${p.activo == 1 ? '❌ Desactivar' : '✅ Activar'}</button>
                    <button class="btn-delete" onclick="eliminar(${p.id_producto})">🗑️ Eliminar</button>
                </td>
            </tr>
        `;
    });
}

function crearProducto() {
    const nombre = document.getElementById('nombre').value.trim();
    const tipo = document.getElementById('tipo').value.trim();
    const precio_venta = parseFloat(document.getElementById('precio_venta').value) || 0;
    const activo = 1;

    if (!nombre) {
        mostrarMensaje('Por favor ingrese el nombre del producto', 'error');
        return;
    }

    fetch(`${window.location.origin}/api/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, tipo, precio_venta, activo })
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById('productoForm').reset();
        cargarProductos();
        mostrarMensaje('Producto agregado exitosamente', 'exito');
    })
    .catch(err => mostrarMensaje('Error de conexión', 'error'));
}

function abrirModal(id) {
    const producto = productos.find(p => p.id_producto === id);
    if (!producto) return;

    document.getElementById('editId').value = producto.id_producto;
    document.getElementById('editNombre').value = producto.nombre;
    document.getElementById('editTipo').value = producto.tipo || '';
    document.getElementById('editPrecioVenta').value = producto.precio_venta || 0;
    document.getElementById('editActivo').checked = producto.activo == 1;

    document.getElementById('modalEditar').style.display = 'block';
}

function cerrarModal() {
    document.getElementById('modalEditar').style.display = 'none';
}

function actualizarProducto() {
    const id = document.getElementById('editId').value;
    const nombre = document.getElementById('editNombre').value.trim();
    const tipo = document.getElementById('editTipo').value.trim();
    const precio_venta = parseFloat(document.getElementById('editPrecioVenta').value) || 0;
    const activo = document.getElementById('editActivo').checked ? 1 : 0;

    if (!nombre) {
        mostrarMensaje('Por favor ingrese el nombre del producto', 'error');
        return;
    }

    fetch(`${window.location.origin}/api/productos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, tipo, precio_venta, activo })
    })
    .then(res => res.json())
    .then(data => {
        cerrarModal();
        cargarProductos();
        mostrarMensaje('Producto actualizado exitosamente', 'exito');
    })
    .catch(err => mostrarMensaje('Error de conexión', 'error'));
}

function toggleActivo(id, activoActual) {
    const nuevoActivo = activoActual == 1 ? 0 : 1;

    fetch(`${window.location.origin}/api/productos/${id}/activo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: nuevoActivo })
    })
    .then(res => res.json())
    .then(data => {
        cargarProductos();
        mostrarMensaje(nuevoActivo == 1 ? 'Producto activado' : 'Producto desactivado', 'exito');
    })
    .catch(err => mostrarMensaje('Error de conexión', 'error'));
}

function eliminar(id) {
    if (!confirm('¿Está seguro de eliminar este producto?')) return;

    fetch(`${window.location.origin}/api/productos/${id}`, {
        method: 'DELETE'
    })
    .then(res => res.json())
    .then(data => {
        cargarProductos();
        mostrarMensaje('Producto eliminado', 'exito');
    })
    .catch(err => mostrarMensaje('Error de conexión', 'error'));
}

function buscarProducto() {
    const busqueda = document.getElementById('busqueda').value.toLowerCase();
    
    const filtrados = productos.filter(p => 
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