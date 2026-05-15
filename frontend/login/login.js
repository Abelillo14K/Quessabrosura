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
    ocultarError();

    try {
        const response = await fetch(`${window.location.origin}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                usuario,
                password
            })
        });

        let data = {};

        try {
            data = await response.json();
        } catch (error) {
            data = {};
        }

        if (!response.ok || !data.success) {
            mostrarError(data.error || 'Credenciales incorrectas');
            return;
        }

        if (!data.token || !data.empleado) {
            mostrarError('Respuesta inválida del servidor');
            return;
        }

        sessionStorage.setItem('empleado', JSON.stringify(data.empleado));
        sessionStorage.setItem('token', data.token);

        window.location.href = '../ventas/ventas.html';

    } catch (err) {
        mostrarError('Error de conexión. Verifique que el servidor esté encendido.');
    } finally {
        btnSubmit.disabled = false;
        btnText.textContent = 'Ingresar';
    }
}

function mostrarError(mensaje) {
    mensajeError.textContent = mensaje;
    mensajeError.style.display = 'block';
}

function ocultarError() {
    mensajeError.textContent = '';
    mensajeError.style.display = 'none';
}

function verificarSesion() {
    const empleado = sessionStorage.getItem('empleado');
    const token = sessionStorage.getItem('token');

    if (empleado && token) {
        window.location.href = '../ventas/ventas.html';
    }
}

verificarSesion();