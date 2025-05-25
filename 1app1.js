const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(
    session({
        secret: 'clave_secreta',
        resave: false,
        saveUninitialized: false,
    })
);
app.use(flash());

// Configuración de SQL Server
const dbConfig = {
    user: 'boss',
    password: 'Pass.2024',
    server: 'localhost\\sqlexpress', // Cambiar según tu servidor
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

        req.session.user = { id: user.id_User, nombre: user.nombre_User, tipo: user.tipo_User };
        res.redirect('/admin');
    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).send('Error en el servidor');
    }
});

// Ruta protegida para /admin
app.get('/admin', verificarAutenticacion, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
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

// Ruta para editar un usuario
app.post('/admin/edit', async (req, res) => {
    const { id_User, nombre_User, tipo_User, estado_User } = req.body;

    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('id_User', sql.Int, id_User)
            .input('nombre_User', sql.VarChar, nombre_User)
            .input('tipo_User', sql.VarChar, tipo_User)
            .input('estado_User', sql.Int, estado_User)
            .query(`UPDATE Users SET nombre_User = @nombre_User, tipo_User = @tipo_User, estado_User = @estado_User WHERE id_User = @id_User`);

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

