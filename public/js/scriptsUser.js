// scriptsUser.js

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInputUser');
    const resultsTable = document.getElementById('resultsTableUser');

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
                            <td>
                                <a href="https://teams.microsoft.com/l/chat/0/0?users=${row.correo}" target="framename" class="btn btn-primary corp">Enviar Teams</a>
                            </td>
                            <td>
                                <button class="btn btn-primary corp" onclick="verMasInformacionUser(${row.id_usuario})">Más Información</button>
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

    // Cargar información del usuario si estamos en userDetails_reducido.html
    const params = new URLSearchParams(window.location.search);
    const idUsuario = params.get('id');

    if (idUsuario) {
        cargarInformacionUsuarioReducido(idUsuario);
    }
});

// Función para redirigir a la página de detalles del usuario reducido
function verMasInformacionUser(id) {
    window.location.href = `/userDetails_reducido.html?id=${id}`;
}

// Función para cargar la información del usuario en userDetails_reducido.html
async function cargarInformacionUsuarioReducido(idUsuario) {
    try {
        const response = await fetch(`/api/usuarios/${idUsuario}`);
        if (!response.ok) {
            throw new Error('Error al obtener la información del usuario');
        }
        const data = await response.json();

        // Rellenar los datos en la lista
        document.getElementById('nombre').textContent = data.nombre || 'N/A';
        document.getElementById('usuario').textContent = data.usuario || 'N/A';
        document.getElementById('correo').textContent = data.correo || 'N/A';
        document.getElementById('gerencia').textContent = data.gerencia || 'N/A';
        document.getElementById('area').textContent = data.area || 'N/A';
        document.getElementById('cargo').textContent = data.cargo || 'N/A';
        document.getElementById('jefe_directo').textContent = data.jefe_directo || 'N/A';
        document.getElementById('anexo').textContent = data.anexo || 'N/A';
        document.getElementById('celular').textContent = data.celular || 'N/A';
    } catch (error) {
        console.error(error);
        alert('Error al cargar la información del usuario.');
    }
}

// Función para regresar a la página anterior
function volver() {
    window.history.back(); // Navegar a la página anterior
}
