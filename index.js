const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();

app.use(cors({
    origin: ['https://gameru.girly.jp', 'http://nyandaru.starfree.jp'], // 許可するオリジンを追加
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

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
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
