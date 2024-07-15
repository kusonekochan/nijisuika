require('dotenv').config();
const express = require('express');
const cors = require('cors'); // 追加
const app = express();
const db = require('./db');

const allowedOrigins = ['http://gameru.girly.jp', 'http://nyandaru.starfree.jp'];
const options = {
  origin: function (origin, callback) {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
};

app.use(cors(options)); // CORSミドルウェアを追加

app.use(express.json());

app.get('/highscores', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM highscores ORDER BY score DESC LIMIT 10');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/highscores', async (req, res) => {
  const { name, score } = req.body;
  try {
    const result = await db.query('INSERT INTO highscores (name, score) VALUES ($1, $2) RETURNING *', [name, score]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
