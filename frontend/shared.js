const API_BASE = window.location.origin;

function getEmpleadoSesion() {
    const data = sessionStorage.getItem('empleado');

    try {
        return data ? JSON.parse(data) : null;
    } catch (error) {
        sessionStorage.removeItem('empleado');
        return null;
    }
}

function getToken() {
    return sessionStorage.getItem('token');
}

function getHeaders(extraHeaders = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...extraHeaders
    };

    const token = getToken();

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
}

function irAlLogin() {
    sessionStorage.clear();
    window.location.href = '../login/login.html';
}

async function apiFetch(url, options = {}) {
    const config = {
        ...options,
        headers: getHeaders(options.headers || {})
    };

    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    try {
        const response = await fetch(`${API_BASE}${url}`, config);

        if (response.status === 401) {
            irAlLogin();
            throw new Error('Sesión expirada. Redirigiendo al login...');
        }

        let data = null;

        try {
            data = await response.json();
        } catch (error) {
            data = {};
        }

        if (!response.ok) {
            throw new Error(data.error || `Error ${response.status}`);
        }

        return data;

    } catch (error) {
        if (error.message === 'Sesión expirada. Redirigiendo al login...') {
            throw error;
        }

        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            throw new Error('Error de conexión con el servidor');
        }

        throw error;
    }
}

function mostrarMensaje(texto, tipo) {
    const mensaje = document.getElementById('mensaje');

    if (!mensaje) {
        alert(texto);
        return;
    }

    mensaje.textContent = texto;
    mensaje.className = `mensaje ${tipo} show`;

    setTimeout(() => {
        mensaje.classList.remove('show');
    }, 3000);
}

function mostrarError(texto) {
    mostrarMensaje(texto, 'error');
}

function mostrarExito(texto) {
    mostrarMensaje(texto, 'exito');
}

function cerrarModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

function cerrarSesion() {
    sessionStorage.removeItem('empleado');
    sessionStorage.removeItem('token');
    window.location.href = '../login/login.html';
}

function verificarSesion() {
    const empleado = getEmpleadoSesion();
    const token = getToken();

    if (!empleado || !token) {
        window.location.href = '../login/login.html';
        return null;
    }

    return empleado;
}

function formatearFecha(fecha) {
    if (!fecha) return '—';

    const fechaTexto = String(fecha);
    const d = new Date(fechaTexto);

    if (isNaN(d.getTime())) {
        return fechaTexto;
    }

    return d.toLocaleDateString('es-GT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        ...(fechaTexto.includes(' ') || fechaTexto.includes('T')
            ? { hour: '2-digit', minute: '2-digit' }
            : {})
    });
}

function formatearMoneda(valor) {
    return `Q${parseFloat(valor || 0).toFixed(2)}`;
}

document.addEventListener('DOMContentLoaded', () => {
    const empleado = verificarSesion();

    if (empleado) {
        document.querySelectorAll('.empleado-nombre').forEach(el => {
            el.textContent = empleado.nombre;
        });
    }
});

window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        cerrarModal();
    }
};

const permisosModulos = {
    Administrador: [
        'empleados',
        'ventas',
        'compras',
        'productos',
        'inventario',
        'recetas',
        'proveedores',
        'gastos',
        'cortes',
        'ticket'
    ],
    Cajero: [
        'ventas',
        'gastos',
        'cortes',
        'ticket'
    ],
    Inventario: [
        'compras',
        'productos',
        'inventario',
        'recetas',
        'proveedores'
    ],
    Cocina: [
        'recetas'
    ]
};

function obtenerEmpleadoSesion() {
    const empleadoLocal = localStorage.getItem('empleado');
    const empleadoSession = sessionStorage.getItem('empleado');
    const empleadoGuardado = empleadoLocal || empleadoSession;

    if (!empleadoGuardado) {
        return null;
    }

    try {
        return JSON.parse(empleadoGuardado);
    } catch (error) {
        return null;
    }
}

function obtenerModuloActual() {
    const path = window.location.pathname.toLowerCase();

    if (path.includes('/empleados/')) return 'empleados';
    if (path.includes('/ventas/')) return 'ventas';
    if (path.includes('/compras/')) return 'compras';
    if (path.includes('/productos/')) return 'productos';
    if (path.includes('/inventario/')) return 'inventario';
    if (path.includes('/recetas/')) return 'recetas';
    if (path.includes('/proveedores/')) return 'proveedores';
    if (path.includes('/gastos/')) return 'gastos';
    if (path.includes('/cortes/')) return 'cortes';
    if (path.includes('/ticket/')) return 'ticket';

    return null;
}

function usuarioPuedeEntrar(modulo) {
    const empleado = obtenerEmpleadoSesion();

    if (!empleado || !empleado.rol) {
        return false;
    }

    const permisos = permisosModulos[empleado.rol] || [];
    return permisos.includes(modulo);
}

function aplicarPermisosMenu() {
    const empleado = obtenerEmpleadoSesion();

    if (!empleado || !empleado.rol) {
        return;
    }

    const permisos = permisosModulos[empleado.rol] || [];
    const links = document.querySelectorAll('.sidebar-menu a');

    links.forEach(link => {
        const href = link.getAttribute('href') || '';
        let modulo = null;

        if (href.includes('empleados')) modulo = 'empleados';
        if (href.includes('ventas')) modulo = 'ventas';
        if (href.includes('compras')) modulo = 'compras';
        if (href.includes('productos')) modulo = 'productos';
        if (href.includes('inventario')) modulo = 'inventario';
        if (href.includes('recetas')) modulo = 'recetas';
        if (href.includes('proveedores')) modulo = 'proveedores';
        if (href.includes('gastos')) modulo = 'gastos';
        if (href.includes('cortes')) modulo = 'cortes';

        if (modulo && !permisos.includes(modulo)) {
            const li = link.closest('li');

            if (li) {
                li.style.display = 'none';
            }
        }
    });
}

function protegerModuloActual() {
    const modulo = obtenerModuloActual();

    if (!modulo) {
        return;
    }

    if (!usuarioPuedeEntrar(modulo)) {
        alert('No tiene permisos para entrar a este módulo');

        const empleado = obtenerEmpleadoSesion();

        if (!empleado || !empleado.rol) {
            window.location.href = '/login/login.html';
            return;
        }

        if (empleado.rol === 'Administrador') {
            window.location.href = '/empleados/empleados.html';
        } else if (empleado.rol === 'Cajero') {
            window.location.href = '/ventas/ventas.html';
        } else if (empleado.rol === 'Inventario') {
            window.location.href = '/inventario/inventario.html';
        } else if (empleado.rol === 'Cocina') {
            window.location.href = '/recetas/recetas.html';
        } else {
            window.location.href = '/login/login.html';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    protegerModuloActual();
    aplicarPermisosMenu();
});