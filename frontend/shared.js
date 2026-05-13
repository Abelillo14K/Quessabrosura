const API_BASE = window.location.origin;

function getEmpleadoSesion() {
    const data = sessionStorage.getItem('empleado');
    return data ? JSON.parse(data) : null;
}

function getToken() {
    return sessionStorage.getItem('token');
}

function getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

function irAlLogin() {
    sessionStorage.clear();
    window.location.href = '../login/login.html';
}

async function apiFetch(url, options = {}) {
    const config = {
        headers: getHeaders(),
        ...options,
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

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Error ${response.status}`);
        }

        return data;
    } catch (error) {
        if (error.message === 'Sesión expirada. Redirigiendo al login...') throw error;
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            throw new Error('Error de conexión con el servidor');
        }
        throw error;
    }
}

function mostrarMensaje(texto, tipo) {
    const mensaje = document.getElementById('mensaje');
    if (!mensaje) return;

    mensaje.textContent = texto;
    mensaje.className = `mensaje ${tipo} show`;
    setTimeout(() => mensaje.classList.remove('show'), 3000);
}

function mostrarError(texto) {
    mostrarMensaje(texto, 'error');
}

function mostrarExito(texto) {
    mostrarMensaje(texto, 'exito');
}

function cerrarModal() {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
}

function cerrarSesion() {
    sessionStorage.removeItem('empleado');
    sessionStorage.removeItem('token');
    window.location.href = '../login/login.html';
}

function verificarSesion() {
    const empleado = getEmpleadoSesion();
    if (!empleado) {
        window.location.href = '../login/login.html';
        return null;
    }
    return empleado;
}

function formatearFecha(fecha) {
    if (!fecha) return '—';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-GT', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        ...(fecha.includes(' ') ? { hour: '2-digit', minute: '2-digit' } : {})
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
