const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware para permitir solo administradores
function verificarAdmin(req, res, next) {
    if (req.session.user && req.session.user.tipo_User === 'admin') {
        return next();
    }
    res.redirect('/login');
}


// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
        secret: 'clave_secreta',
        resave: false,
        saveUninitialized: true,
    }));
app.use(flash());

// Configuración de SQL Server
const dbConfig = {
    user: 'boss',
    password: 'Pass.2024',
    server: 'CLSCLD000040\\SQLEXPRESS', // Cambiar según tu servidor
    database: 'wchDB',
    options: {
        encrypt: false, // Cambiar a true si usas Azure
    },
};

// Middleware para proteger rutas
function verificarAutenticacion(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login');
}

// Middleware para pasar mensajes flash a las vistas
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    next();
});
// Ruta para mostrar la página de login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Ruta para procesar el login
app.post('/login', async (req, res) => {
    const { nombre_User, pass_User } = req.body;

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool
            .request()
            .input('nombre_User', sql.VarChar, nombre_User)
            .query(`SELECT * FROM Users WHERE nombre_User = @nombre_User AND estado_User = 1`);

        if (result.recordset.length === 0) {
            req.flash('error', 'Usuario no encontrado o inactivo');
            return res.redirect('/login');
        }

        const user = result.recordset[0];
        const validPassword = await bcrypt.compare(pass_User, user.pass_User);

        if (!validPassword) {
            req.flash('error', 'Contraseña incorrecta');
            return res.redirect('/login');
        }

        // req.session.user = { id: user.id_User, nombre: user.nombre_User, tipo: user.tipo_User };
        // res.redirect('/admin');
        req.session.user = { id: user.id_User, nombre: user.nombre_User, tipo: user.tipo_User };
if (user.tipo_User === 'admin') {
    res.redirect('/admin');
} else {
    res.redirect('/'); // O cualquier otra página de usuario normal
}

    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).send('Error en el servidor');
    }
});

// Ruta protegida para /admin
app.get('/admin', verificarAutenticacion, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// Ruta para desactivar colaborador
app.get('/admin/deactivateColab', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'deactivateColab.html'));
});

// Ruta para eliminar colaborador
app.get('/admin/deleteColab', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'deleteColab.html'));
});


//Ruta para editar Colaborador
app.get('/admin/editColab', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'editColab.html'));
});

app.post('/admin/editColab', async (req, res) => {
    const { id_usuario, ...campos } = req.body; // Extraer el id_usuario y los demás campos

    if (!id_usuario) {
        return res.redirect('/admin/editColab?error_msg=ID de colaborador es obligatorio');
    }

    try {
        const pool = await sql.connect(dbConfig);

        // Construcción dinámica del query
        let updateFields = [];
        let request = pool.request();

        Object.entries(campos).forEach(([key, value]) => {
            if (value && value.trim() !== '') { // Solo incluir campos no vacíos
                updateFields.push(`${key} = @${key}`);
                request.input(key, sql.VarChar, value);
            }
        });

        if (updateFields.length === 0) {
            return res.redirect('/admin/editColab?error_msg=Ningún campo válido ingresado para actualizar');
        }

        request.input('id_usuario', sql.Int, id_usuario);

        const query = `UPDATE USUARIOS SET ${updateFields.join(', ')} WHERE id_usuario = @id_usuario`;
        await request.query(query);

        res.redirect('/admin/editColab?success_msg=Colaborador actualizado exitosamente');
    } catch (error) {
        console.error('Error actualizando colaborador:', error);
        res.redirect('/admin/editColab?error_msg=Error al actualizar colaborador');
    }
});



// Ruta para desactivar un colaborador
app.post('/admin/deactivateColab', async (req, res) => {
    const { id_usuario } = req.body;

    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('id_usuario', sql.Int, id_usuario)
            .query(`UPDATE Usuarios SET estado = 'inactivo' WHERE id_usuario = @id_usuario`);

        res.redirect('/admin/deactivateColab?success_msg=Colaborador desactivado exitosamente');
    } catch (error) {
        console.error('Error desactivando colaborador:', error);
        res.redirect('/admin/deactivateColab?error_msg=Error desactivando colaborador');
    }
});

// Ruta para eliminar un colaborador
app.post('/admin/deleteColab', async (req, res) => {
    const { id_usuario } = req.body;

    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('id_usuario', sql.Int, id_usuario)
            .query(`DELETE FROM Usuarios WHERE id_usuario = @id_usuario`);

        res.redirect('/admin/deleteColab?success_msg=Colaborador eliminado exitosamente');
    } catch (error) {
        console.error('Error eliminando colaborador:', error);
        res.redirect('/admin/deleteColab?error_msg=Error eliminando colaborador');
    }
});


// Ruta para cerrar sesión
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Ruta para búsquedas generales
app.get('/search', async (req, res) => {
    const { query } = req.query;

    if (!query) {
        return res.json([]); // Retorna un arreglo vacío si no hay consulta
    }

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool
            .request()
            .input('query', sql.VarChar, `%${query}%`)
            .query(`
                SELECT id_usuario, nombre, correo, anexo, celular, equipo
                FROM USUARIOS
                WHERE nombre LIKE @query OR usuario LIKE @query
            `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al realizar la búsqueda:', error);
        res.status(500).send('Error del servidor');
    }
});

// Ruta para obtener detalles de un usuario por ID
app.get('/api/usuarios/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool
            .request()
            .input('id', sql.Int, id)
            .query(`
                SELECT id_usuario, rut, nombre, contrato, cod_vethor, usuario, correo,
                       gerencia, area, cargo, jefe_directo, anexo, celular, equipo, estado
                FROM USUARIOS
                WHERE id_usuario = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).send('Usuario no encontrado');
        }

        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Error al obtener los datos del usuario:', error);
        res.status(500).send('Error al obtener los datos');
    }
});

//Rutas para ver todos los usuarios
app.get('/admin/verUsuariosHTML', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'verUsuarios.html'));
});


app.get('/admin/verUsuarios', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT nombre, correo, anexo, celular, equipo FROM USUARIOS');
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ error: 'Error al obtener los usuarios' });
    }
});


// Rutas para vistas
app.get('/admin/busqueda', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'busqueda.html'));
});

app.get('/userDetails.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'userDetails.html'));
});

app.get('/userDetails_reducido.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'userDetails_reducido.html'));
});

// Ruta para servir el HTML de registro de colaboradores
app.get('/admin/registerColab', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'registerColab.html'));
});

// Rutas para mostrar los formularios
app.get('/admin/register', verificarAutenticacion, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/admin/edit', verificarAutenticacion, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'edit.html'));
});

app.get('/admin/delete', verificarAutenticacion, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'delete.html'));
});

// Ruta para servir el HTML de gestión de colaboradores
app.get('/admin/gestionColab', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'gestionColab.html'));
});

//PEDIDO RUTAS
//Ruta para registrar nuevos usuarios administradores
// Ruta para registrar un usuario
app.post('/admin/register', async (req, res) => {
    const { nombre_User, pass_User, tipo_User, estado_User } = req.body;
    const hash = await bcrypt.hash(pass_User, 10);

    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('nombre_User', sql.VarChar, nombre_User)
            .input('pass_User', sql.VarChar, hash)
            .input('tipo_User', sql.VarChar, tipo_User)
            .input('estado_User', sql.Int, estado_User)
            .query(`INSERT INTO Users (nombre_User, pass_User, tipo_User, estado_User) VALUES (@nombre_User, @pass_User, @tipo_User, @estado_User)`);

        res.redirect('/admin');
    } catch (error) {
        console.error('Error registrando usuario:', error);
        res.status(500).send('Error en el servidor');
    }
});

app.post('/admin/registerColab', async (req, res) => {
    const {
        id_usuario, rut, nombre, contrato, cod_vethor, usuario, correo,
        gerencia, area, cargo, jefe_directo, anexo, celular, equipo, estado
    } = req.body;

    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('id_usuario', sql.Int, id_usuario)
            .input('rut', sql.VarChar, rut)
            .input('nombre', sql.VarChar, nombre)
            .input('contrato', sql.VarChar, contrato)
            .input('cod_vethor', sql.VarChar, cod_vethor)
            .input('usuario', sql.VarChar, usuario)
            .input('correo', sql.VarChar, correo)
            .input('gerencia', sql.VarChar, gerencia)
            .input('area', sql.VarChar, area)
            .input('cargo', sql.VarChar, cargo)
            .input('jefe_directo', sql.VarChar, jefe_directo)
            .input('anexo', sql.VarChar, anexo)
            .input('celular', sql.VarChar, celular)
            .input('equipo', sql.VarChar, equipo)
            .input('estado', sql.Int, estado)
            .query(`INSERT INTO Usuarios (id_usuario, rut, nombre, contrato, cod_vethor, usuario, correo, gerencia, area, cargo, jefe_directo, anexo, celular, equipo, estado) 
                    VALUES (@id_usuario, @rut, @nombre, @contrato, @cod_vethor, @usuario, @correo, @gerencia, @area, @cargo, @jefe_directo, @anexo, @celular, @equipo, @estado)`);

        res.redirect('/admin/registerColab?success_msg=Colaborador registrado exitosamente');
    } catch (error) {
        console.error('Error registrando colaborador:', error);
        res.redirect('/admin/registerColab?error_msg=Error registrando colaborador');
    }
});


app.post('/admin/edit', async (req, res) => {
    const { id_User, nombre_User, tipo_User, estado_User } = req.body;

    try {
        const pool = await sql.connect(dbConfig);
        const request = pool.request().input('id_User', sql.Int, id_User);

        // Construir la consulta dinámicamente
        let query = 'UPDATE Users SET ';
        if (nombre_User) {
            request.input('nombre_User', sql.VarChar, nombre_User);
            query += 'nombre_User = @nombre_User, ';
        }
        if (tipo_User) {
            request.input('tipo_User', sql.VarChar, tipo_User);
            query += 'tipo_User = @tipo_User, ';
        }
        if (estado_User) {
            request.input('estado_User', sql.Int, estado_User);
            query += 'estado_User = @estado_User, ';
        }

        // Eliminar la última coma y agregar la cláusula WHERE
        query = query.slice(0, -2) + ' WHERE id_User = @id_User';

        await request.query(query);

        res.redirect('/admin');
    } catch (error) {
        console.error('Error editando usuario:', error);
        res.status(500).send('Error en el servidor');
    }
});

// Ruta para eliminar un usuario
app.post('/admin/delete', async (req, res) => {
    const { id_User } = req.body;

    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('id_User', sql.Int, id_User)
            .query(`DELETE FROM Users WHERE id_User = @id_User`);

        res.redirect('/admin');
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        res.status(500).send('Error en el servidor');
    }
});

//Ruta para verificar sesión en el frontend
app.get('/session', (req, res) => {
    if (req.session.user) {
        res.json({ authenticated: true, user: req.session.user });
    } else {
        res.json({ authenticated: false });
    }
});


//Ruta para búsqueda avanzada
app.get('/admin/buscarUsuarios', verificarAutenticacion, async (req, res) => {
    const { query } = req.query;

    if (!query) {
        return res.json([]);
    }

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool
            .request()
            .input('query', sql.VarChar, `%${query}%`)
            .query(`
                SELECT id_User, nombre_User, tipo_User, estado_User
                FROM Users
                WHERE nombre_User LIKE @query OR tipo_User LIKE @query
            `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error en búsqueda:', error);
        res.status(500).send('Error en el servidor');
    }
});



// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

