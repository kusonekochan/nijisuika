const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();

// CORS設定: 一時的に全てのオリジンを許可
app.use(cors({
    origin: '*', // すべてのオリジンを許可
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'] // 必要に応じてヘッダーを追加
}));


// JSONボディの解析
app.use(express.json());

// PostgreSQLクライアントの設定
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

// ハイスコアの保存
app.post('/highscores', async (req, res) => {
    try {
        const { name, score } = req.body;
        await pool.query('INSERT INTO highscores (name, score) VALUES ($1, $2)', [name, score]);
        res.status(201).json({ message: 'High score saved' });
    } catch (error) {
        console.error('Error saving high score:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ハイスコアの取得
app.get('/highscores', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM highscores ORDER BY score DESC LIMIT 10');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching high scores:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// サーバーの起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
