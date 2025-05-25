// Función para manejar la búsqueda en tiempo real
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const resultsTable = document.getElementById('resultsTable');

    if (searchInput && resultsTable) {
        searchInput.addEventListener('input', async () => {
            const query = searchInput.value.trim();

            if (query.length === 0) {
                resultsTable.innerHTML = '';
                return;
            }

            try {
                const response = await fetch(`/search?query=${encodeURIComponent(query)}`);
                const data = await response.json();

                resultsTable.innerHTML = data
                    .map(
                        (row) => `
                        <tr>
                            <td>${row.nombre || 'N/A'}</td>
                            <td><a href="mailto:${row.correo || 'N/A'}">${row.correo || 'N/A'}</a></td>
                            <td>${row.anexo || 'N/A'}</td>
                            <td>${row.celular || 'N/A'}</td>
                            <td>${row.equipo || 'N/A'}</td>
                            <td>
                                <button class="btn btn-primary corp" onclick="verMasInformacion(${row.id_usuario})">Más Información</button>
                            </td>
                        </tr>
                    `
                    )
                    .join('');
            } catch (error) {
                console.error('Error al buscar:', error);
            }
        });
    }

    // Cargar información del usuario si estamos en userDetails.html
    const params = new URLSearchParams(window.location.search);
    const idUsuario = params.get('id');

    if (idUsuario) {
        cargarInformacionUsuario(idUsuario);
    }

    // Mostrar mensajes de éxito o error
    const successMsg = params.get('success_msg');
    const errorMsg = params.get('error_msg');
    const messageContainer = document.getElementById('message-container');

    if (messageContainer) {
        if (successMsg) {
            messageContainer.innerHTML = `<div class="alert alert-success">${successMsg}</div>`;
        }
        if (errorMsg) {
            messageContainer.innerHTML = `<div class="alert alert-danger">${errorMsg}</div>`;
        }
    }
});

// Función para redirigir a la página de detalles del usuario
function verMasInformacion(id) {
    window.location.href = `/userDetails.html?id=${id}`;
}

// Función para cargar la información del usuario en userDetails.html
async function cargarInformacionUsuario(idUsuario) {
    try {
        const response = await fetch(`/api/usuarios/${idUsuario}`);
        if (!response.ok) {
            throw new Error('Error al obtener la información del usuario');
        }
        const data = await response.json();

        // Rellenar los datos en la lista
        document.getElementById('id_usuario').textContent = data.id_usuario || 'N/A';
        document.getElementById('rut').textContent = data.rut || 'N/A';
        document.getElementById('nombre').textContent = data.nombre || 'N/A';
        document.getElementById('contrato').textContent = data.contrato || 'N/A';
        document.getElementById('cod_vethor').textContent = data.cod_vethor || 'N/A';
        document.getElementById('usuario').textContent = data.usuario || 'N/A';
        document.getElementById('correo').textContent = data.correo || 'N/A';
        document.getElementById('gerencia').textContent = data.gerencia || 'N/A';
        document.getElementById('area').textContent = data.area || 'N/A';
        document.getElementById('cargo').textContent = data.cargo || 'N/A';
        document.getElementById('jefe_directo').textContent = data.jefe_directo || 'N/A';
        document.getElementById('anexo').textContent = data.anexo || 'N/A';
        document.getElementById('celular').textContent = data.celular || 'N/A';
        document.getElementById('equipo').textContent = data.equipo || 'N/A';
        document.getElementById('estado').textContent = data.estado || 'N/A';
    } catch (error) {
        console.error(error);
        alert('Error al cargar la información del usuario.');
    }
}

// Función para regresar a la página anterior
function volver() {
    window.history.back(); // Navegar a la página anterior
}