const express = require('express');
const cors = require('cors');
const app = express();
const db = require('./db');

const corsOptions = {
  origin: ['http://gameru.girly.jp', 'http://nyandaru.starfree.jp'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

app.get('/highscores', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM highscores ORDER BY score DESC LIMIT 10');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching high scores:', err);
    res.status(500).json({ error: 'Failed to fetch high scores' });
  }
});

app.post('/highscores', async (req, res) => {
  const { name, score } = req.body;
  try {
    const result = await db.query('INSERT INTO highscores (name, score) VALUES ($1, $2) RETURNING *', [name, score]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error saving high score:', err);
    res.status(500).json({ error: 'Failed to save high score' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});