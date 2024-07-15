require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
    ca: process.env.CA_CERT // この行を追加
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
