let productos = [];
const tabla = document.getElementById('tabla');
const mensaje = document.getElementById('mensaje');

function getStockClass(stock) {
    if (stock <= 0) return 'stock-agotado';
    if (stock < 10) return 'stock-bajo';
    return 'stock-normal';
}

function cargarProductos() {
    fetch('http://localhost:3000/productos')
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
                <td colspan="7" style="text-align: center; color: #999; font-style: italic; padding: 30px;">
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
                <td>${p.presentacion || 'N/A'}</td>
                <td>Q${p.precio_compra ? p.precio_compra.toFixed(2) : '0.00'}</td>
                <td>Q${p.precio_venta ? p.precio_venta.toFixed(2) : '0.00'}</td>
                <td><span class="stock-badge ${getStockClass(p.stock)}">${p.stock}</span></td>
                <td>
                    <button class="btn-edit" onclick="abrirModal(${p.id_producto})">✏️ Editar</button>
                    <button class="btn-delete" onclick="eliminar(${p.id_producto})">🗑️ Eliminar</button>
                </td>
            </tr>
        `;
    });
}

function crearProducto() {
    const nombre = document.getElementById('nombre').value.trim();
    const presentacion = document.getElementById('presentacion').value.trim();
    const stock = parseInt(document.getElementById('stock').value) || 0;
    const precio_compra = parseFloat(document.getElementById('precio_compra').value) || 0;
    const precio_venta = parseFloat(document.getElementById('precio_venta').value) || 0;
    const id_categoria = parseInt(document.getElementById('id_categoria').value) || 1;

    if (!nombre) {
        mostrarMensaje('Por favor ingrese el nombre del producto', 'error');
        return;
    }

    fetch('http://localhost:3000/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, presentacion, stock, precio_compra, precio_venta, id_categoria })
    })
    .then(res => {
        if (res.ok) {
            document.getElementById('productoForm').reset();
            cargarProductos();
            mostrarMensaje('Producto agregado exitosamente', 'exito');
        } else {
            mostrarMensaje('Error al agregar producto', 'error');
        }
    })
    .catch(err => mostrarMensaje('Error de conexión', 'error'));
}

function abrirModal(id) {
    const producto = productos.find(p => p.id_producto === id);
    if (!producto) return;

    document.getElementById('editId').value = producto.id_producto;
    document.getElementById('editNombre').value = producto.nombre;
    document.getElementById('editPresentacion').value = producto.presentacion || '';
    document.getElementById('editPrecioCompra').value = producto.precio_compra || 0;
    document.getElementById('editPrecioVenta').value = producto.precio_venta || 0;
    document.getElementById('editStock').value = producto.stock || 0;
    document.getElementById('editCategoria').value = producto.id_categoria || 1;

    document.getElementById('modalEditar').style.display = 'block';
}

function cerrarModal() {
    document.getElementById('modalEditar').style.display = 'none';
}

function actualizarProducto() {
    const id = document.getElementById('editId').value;
    const nombre = document.getElementById('editNombre').value.trim();
    const presentacion = document.getElementById('editPresentacion').value.trim();
    const precio_compra = parseFloat(document.getElementById('editPrecioCompra').value) || 0;
    const precio_venta = parseFloat(document.getElementById('editPrecioVenta').value) || 0;
    const stock = parseInt(document.getElementById('editStock').value) || 0;
    const id_categoria = parseInt(document.getElementById('editCategoria').value) || 1;

    if (!nombre) {
        mostrarMensaje('Por favor ingrese el nombre del producto', 'error');
        return;
    }

    fetch(`http://localhost:3000/productos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, presentacion, precio_compra, precio_venta, stock, id_categoria })
    })
    .then(res => {
        if (res.ok) {
            cerrarModal();
            cargarProductos();
            mostrarMensaje('Producto actualizado exitosamente', 'exito');
        } else {
            mostrarMensaje('Error al actualizar producto', 'error');
        }
    })
    .catch(err => mostrarMensaje('Error de conexión', 'error'));
}

function eliminar(id) {
    if (!confirm('¿Está seguro de eliminar este producto?')) return;

    fetch(`http://localhost:3000/productos/${id}`, {
        method: 'DELETE'
    })
    .then(res => {
        if (res.ok) {
            cargarProductos();
            mostrarMensaje('Producto eliminado', 'exito');
        } else {
            mostrarMensaje('Error al eliminar', 'error');
        }
    })
    .catch(err => mostrarMensaje('Error de conexión', 'error'));
}

function buscarProducto() {
    const busqueda = document.getElementById('busqueda').value.toLowerCase();
    
    const filtrados = productos.filter(p => 
        p.nombre.toLowerCase().includes(busqueda) ||
        (p.presentacion && p.presentacion.toLowerCase().includes(busqueda))
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

cargarProductos();