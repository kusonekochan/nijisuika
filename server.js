const express = require('express');
const cors = require('cors'); // cors パッケージを読み込む
const app = express();

// CORS 設定を追加
app.use(cors({
    origin: 'https://gameru.girly.jp' // 許可するオリジンを指定
}));

// JSON ボディの解析
app.use(express.json());

// ハイスコアのルート
app.post('/highscores', (req, res) => {
    // ハイスコアの保存処理
});

app.get('/highscores', (req, res) => {
    // ハイスコアの取得処理
});

// サーバーの起動
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
