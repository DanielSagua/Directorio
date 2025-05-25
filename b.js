const sql = require('mssql');
const bcrypt = require('bcryptjs');

const dbConfig = {
    user: 'boss',
    password: 'Pass.2024',
    server: 'localhost',
    database: 'wchDB',
    options: { encrypt: false },
};

async function crearUsuarioAdmin() {
    try {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .query(`INSERT INTO Users (nombre_User, pass_User, tipo_User, estado_User) 
                    VALUES ('admin', '${hashedPassword}', 'admin', 1)`);
        console.log('Usuario administrador creado');
    } catch (error) {
        console.error('Error al crear usuario:', error);
    }
}

crearUsuarioAdmin();
