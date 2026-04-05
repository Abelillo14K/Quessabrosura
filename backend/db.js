const mysql = require('mysql2/promise');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Root123',
    database: 'QUESSABROSURA'
});

module.exports = db;