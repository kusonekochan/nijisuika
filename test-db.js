require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    ca: fs.readFileSync(process.env.SSL_CERT_PATH).toString(),
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 5000, // 接続タイムアウトを5秒に設定
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
    console.error('Stack trace:', err.stack);
  } else {
    console.log('Connection successful:', res.rows);
  }
  pool.end();
});
