const express = require('express');
const app = express();

app.use(express.json());

app.post('/highscores', (req, res) => {
    // ハイスコアを保存する処理
});

app.listen(10000, () => {
    console.log('Server running on port 10000');
});
