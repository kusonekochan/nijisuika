require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
<<<<<<< HEAD
    rejectUnauthorized: false
  }
=======
    rejectUnauthorized: false,
  },
>>>>>>> 8d6451687319de50b94334db384cc9912f7a90fd
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};