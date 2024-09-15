const { Pool } = require('pg');
const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({
    origin: 'https://gameru.girly.jp/'
}));

app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: true,
        ca: fs.readFileSync(__dirname + '/combined-certificates.crt').toString(),
    },
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('Database connection error:', err.stack);
        return;
    }
    console.log('Database connected successfully');
    release();
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/highscores', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM highscores ORDER BY score DESC LIMIT 10');
        res.json(result.rows);
    } catch (err) {
        console.error('Error retrieving highscores', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/highscores', async (req, res) => {
    const { name, score } = req.body;
    try {
        const result = await pool.query('INSERT INTO highscores (name, score) VALUES ($1, $2) RETURNING *', [name, score]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error saving highscore', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
