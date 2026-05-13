const mensajeError = document.getElementById('mensajeError');
const btnSubmit = document.getElementById('btnSubmit');
const btnText = document.getElementById('btnText');

async function iniciarSesion(e) {
    e.preventDefault();

    const usuario = document.getElementById('usuario').value.trim();
    const password = document.getElementById('password').value;

    if (!usuario || !password) {
        mostrarError('Por favor complete todos los campos');
        return;
    }

    btnSubmit.disabled = true;
    btnText.textContent = 'Verificando...';
    mensajeError.textContent = '';

    try {
        const response = await fetch(`${window.location.origin}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, password })
        });

        const data = await response.json();

        if (data.success) {
            sessionStorage.setItem('empleado', JSON.stringify(data.empleado));
            if (data.token) {
                sessionStorage.setItem('token', data.token);
            }
            window.location.href = '../empleados/empleados.html';
        } else {
            mostrarError(data.error || 'Credenciales incorrectas');
        }
    } catch (err) {
        mostrarError('Error de conexión: ' + (err.message || 'intente de nuevo'));
    } finally {
        btnSubmit.disabled = false;
        btnText.textContent = 'Ingresar';
    }
}

function mostrarError(mensaje) {
    mensajeError.textContent = mensaje;
    mensajeError.style.display = 'block';
}

function verificarSesion() {
    const empleado = sessionStorage.getItem('empleado');
    if (empleado) {
        window.location.href = '../empleados/empleados.html';
    }
}

verificarSesion();
