const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();

app.use(cors({
    origin: '*'
}));

app.use(express.json());

app.get('/highscores', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM highscores ORDER BY score DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error retrieving high scores', err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/highscores', async (req, res) => {
    const { name, score } = req.body;

    if (!name || !score) {
        return res.status(400).json({ error: 'Invalid input' });
    }

    try {
        const result = await db.query('INSERT INTO highscores (name, score) VALUES ($1, $2) RETURNING *', [name, score]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error saving high score', err);
        res.status(500).json({ error: 'Database error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
