const { Engine, Render, Runner, World, Bodies, Events } = Matter;

const MAX_SCREEN_WIDTH = 540;
const INIT_SCREEN_HEIGHT = 960;
const ASPECT_RATIO = MAX_SCREEN_WIDTH / INIT_SCREEN_HEIGHT;
const BALL_TYPES = [
    { radius: 10, image: 'maru/001.png' },
    { radius: 20, image: 'maru/002.png' },
    { radius: 30, image: 'maru/003.png' },
    { radius: 40, image: 'maru/004.png' },
    { radius: 50, image: 'maru/005.png' },
    { radius: 60, image: 'maru/006.png' },
    { radius: 70, image: 'maru/007.png' },
    { radius: 80, image: 'maru/008.png' },
    { radius: 90, image: 'maru/009.png' },
    { radius: 100, image: 'maru/010.png' }
];

let balls = [];
let score = 0;
let comboCount = 0;
const COMBO_BONUS = [1, 1, 2, 3, 4, 5];
let nextBallType = BALL_TYPES[0];
let highScores = [];
let backgroundImg = null;
let gameOverBackgroundImg = null;
let scoreImages = {};
let lastBallTime = 0;
let isGameOver = false;
let comboSounds = {};
let startTime = null;
let elapsedTime = 0;

let bgmAudio = null;
let isBgmPlayed = false; // 追加: BGMが再生されたかどうかのフラグ
let audioContext = null; // 追加: AudioContext
let audioSources = {}; // 追加: オーディオソースを管理するオブジェクト

const canvas = document.getElementById('gameCanvas');
const videoCanvas = document.getElementById('videoCanvas');
const videoCtx = videoCanvas.getContext('2d');
const restartArea = document.getElementById('restartArea');
const engine = Engine.create();
const world = engine.world;
const render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
        width: window.innerWidth > MAX_SCREEN_WIDTH ? MAX_SCREEN_WIDTH : window.innerWidth,
        height: window.innerWidth > MAX_SCREEN_WIDTH ? (window.innerHeight / window.innerWidth) * MAX_SCREEN_WIDTH : window.innerHeight,
        wireframes: false,
        background: 'transparent'
    }
});

Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

const log = (...messages) => {
    console.log(...messages);
};

const resizeCanvas = () => {
    const screenWidth = window.innerWidth > MAX_SCREEN_WIDTH ? MAX_SCREEN_WIDTH : window.innerWidth;
    const screenHeight = screenWidth / ASPECT_RATIO;
    canvas.width = screenWidth;
    canvas.height = screenHeight;
    videoCanvas.width = screenWidth;
    videoCanvas.height = screenHeight;
    restartArea.style.width = `${screenWidth}px`;
    restartArea.style.height = `150px`;
    restartArea.style.bottom = `10%`;
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, isGameOver ? gameOverBackgroundImg : backgroundImg);
    log('Canvas resized', screenWidth, screenHeight);
};

window.addEventListener('resize', resizeCanvas);

const loadImage = (src) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
            log(`Image loaded: ${src}`);
            resolve(img);
        };
        img.onerror = (err) => {
            log(`Failed to load image at ${src}: ${err.message}`);
            reject(new Error(`Failed to load image at ${src}: ${err.message}`));
        };
    });
};

const loadAudio = (src) => {
    return new Promise((resolve, reject) => {
        const audio = new Audio(src);
        audio.oncanplaythrough = () => resolve(audio);
        audio.onerror = (err) => {
            log(`Failed to load audio at ${src}: ${err.message}`);
            reject(new Error(`Failed to load audio at ${src}: ${err.message}`));
        };
    });
};

const ballImages = {};
Promise.all(BALL_TYPES.map(type => loadImage(type.image)))
    .then(images => {
        images.forEach((img, index) => {
            ballImages[BALL_TYPES[index].radius] = img;
        });
    })
    .catch(err => {
        log("Failed to load images:", err);
    });

for (let i = 0; i <= 9; i++) {
    const filename = `count/${i.toString().padStart(2, '0')}.png`;
    loadImage(filename)
        .then(img => {
            scoreImages[i] = img;
        })
        .catch(err => {
            log(`Failed to load score image at ${filename}: ${err.message}`);
        });
}

Promise.all([
    loadAudio('sound/001.mp3').then(audio => { comboSounds[1] = audio; }),
    loadAudio('sound/002.mp3').then(audio => { comboSounds[2] = audio; }),
    loadAudio('sound/003.mp3').then(audio => { comboSounds[3] = audio; }),
    loadAudio('sound/004.mp3').then(audio => { comboSounds[4] = audio; }),
    loadAudio('sound/005.mp3').then(audio => { comboSounds[5] = audio; }),
    loadAudio('sound/000.mp3').then(audio => { bgmAudio = audio; bgmAudio.volume = 0.2; }) // BGMのロードとデフォルト音量の設定
]).catch(err => {
    log(err);
});

const createBall = (x, y, radius, image) => {
    const ball = Bodies.circle(x, y, radius, {
        render: {
            sprite: {
                texture: image.src,
                xScale: (radius * 2) / image.width,
                yScale: (radius * 2) / image.height
            }
        },
        restitution: 0.5,
        friction: 0.5
    });
    World.add(world, ball);
    log('Ball created', { x, y, radius });
    return ball;
};

const increaseScore = (amount, combo) => {
    score += amount * COMBO_BONUS[Math.min(combo, COMBO_BONUS.length - 1)];
    log('Score increased:', score);
};

const resetCombo = () => {
    comboCount = 0;
    log('Combo reset');
};

const handleSpecialScoreEvent = async () => {
    const oldVideo = document.getElementById('cutinVideo');
    if (oldVideo) {
        oldVideo.remove();
    }

    const video = document.createElement('video');
    video.id = 'cutinVideo';
    video.style.display = 'block';
    document.body.appendChild(video);

    const videoSources = ['cutin/cutin001.mp4', 'cutin/cutin002.mp4', 'cutin/cutin003.mp4', 'cutin/cutin004.mp4', 'cutin/cutin005.mp4'];
    const randomIndex = Math.floor(Math.random() * videoSources.length);
    video.src = videoSources[randomIndex];

    // クロマキー色を設定 (#05FE01)
    const chromaKeyColor = [5, 254, 1]; // R, G, B
    const colorThreshold = 100; // 許容する色の差の範囲

    video.play().catch(err => {
        log(`Error playing video: ${err.message}`);
    });

    video.addEventListener('play', function() {
        const draw = () => {
            if (!video.paused && !video.ended) {
                const drawHeight = 960; // 固定高さ
                const drawWidth = video.videoWidth * (drawHeight / video.videoHeight); // アスペクト比を維持して幅を計算

                const drawX = (videoCanvas.width - drawWidth) / 2;
                const drawY = (videoCanvas.height - drawHeight) / 2;

                videoCtx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
                let frame = videoCtx.getImageData(0, 0, videoCanvas.width, videoCanvas.height);
                let length = frame.data.length / 4;

                for (let i = 0; i < length; i++) {
                    let r = frame.data[i * 4 + 0];
                    let g = frame.data[i * 4 + 1];
                    let b = frame.data[i * 4 + 2];

                    if (Math.abs(r - chromaKeyColor[0]) < colorThreshold &&
                        Math.abs(g - chromaKeyColor[1]) < colorThreshold &&
                        Math.abs(b - chromaKeyColor[2]) < colorThreshold) {
                        frame.data[i * 4 + 3] = 0;
                    }
                }

                videoCtx.putImageData(frame, 0, 0);
                requestAnimationFrame(draw);
            }
        };
        draw();
    });

    return new Promise(resolve => {
        video.onended = () => {
            video.style.display = 'none';
            videoCtx.clearRect(0, 0, videoCanvas.width, videoCanvas.height);
            
            // キャッシュをクリア
            video.pause();
            video.src = '';
            video.load();

            resolve();
        };
    });
};

const handleCollision = (event) => {
    const pairs = event.pairs;
    pairs.forEach(async (pair) => {
        const { bodyA, bodyB } = pair;
        if (bodyA.circleRadius === bodyB.circleRadius) {
            const index = BALL_TYPES.findIndex(type => type.radius === bodyA.circleRadius);
            if (index >= 0 && index < BALL_TYPES.length - 1) {
                World.remove(world, bodyA);
                World.remove(world, bodyB);
                balls = balls.filter(ball => ball !== bodyA && ball !== bodyB);
                comboCount += 1;
                increaseScore(bodyA.circleRadius * 2, comboCount); // スコアを2倍に
                const newBallType = BALL_TYPES[index + 1];
                const newBall = createBall(bodyA.position.x, bodyA.position.y, newBallType.radius, ballImages[newBallType.radius]);
                balls.push(newBall);
                const comboSound = comboSounds[Math.min(comboCount, 5)];
                if (comboSound) {
                    playSound(comboSound); // playSound関数を使用して再生
                }

                // 発動条件に応じてカットインを再生
                if ((newBallType.radius === 80 || newBallType.radius === 90 || newBallType.radius === 100) && Math.random() < 0.33) {
                    await handleSpecialScoreEvent();
                }

                log('Balls merged and new ball created', { radius: newBallType.radius });
            } else if (bodyA.circleRadius === 100) {
                World.remove(world, bodyA);
                World.remove(world, bodyB);
                balls = balls.filter(ball => ball !== bodyA && ball !== bodyB);
                comboCount += 1;
                increaseScore(100 * 2, comboCount); // スコアを2倍に
                const comboSound = comboSounds[Math.min(comboCount, 5)];
                if (comboSound) {
                    playSound(comboSound); // playSound関数を使用して再生
                }

                // 発動条件に応じてカットインを再生
                if (Math.random() < 0.33) {
                    await handleSpecialScoreEvent();
                }

                log('Balls removed, no merge possible');
            } else {
                World.remove(world, bodyA);
                World.remove(world, bodyB);
                balls = balls.filter(ball => ball !== bodyA && ball !== bodyB);
                comboCount += 1;
                increaseScore(100, comboCount);
                const comboSound = comboSounds[Math.min(comboCount, 5)];
                if (comboSound) {
                    playSound(comboSound); // playSound関数を使用して再生
                }
                log('Balls removed, no merge possible');
            }
        }
    });
};

Events.on(engine, 'collisionStart', handleCollision);

const resetGame = () => {
    World.clear(world);
    Engine.clear(engine);
    balls = [];
    score = 0;
    comboCount = 0;
    lastBallTime = 0;
    isGameOver = false;
    startTime = Date.now();
    elapsedTime = 0;
    log('Game reset');

    const floor = Bodies.rectangle(MAX_SCREEN_WIDTH / 2, INIT_SCREEN_HEIGHT - 25, MAX_SCREEN_WIDTH, 50, { isStatic: true });
    const wallLeft = Bodies.rectangle(-25, INIT_SCREEN_HEIGHT / 2, 50, INIT_SCREEN_HEIGHT, { isStatic: true });
    const wallRight = Bodies.rectangle(MAX_SCREEN_WIDTH + 25, INIT_SCREEN_HEIGHT / 2, 50, INIT_SCREEN_HEIGHT, { isStatic: true });
    World.add(world, [floor, wallLeft, wallRight]);

    nextBallType = BALL_TYPES[0];
    log('Walls and floor created');

    // cutin関連の設定を再有効化
    const video = document.getElementById('cutinVideo');
    videoCtx.clearRect(0, 0, videoCanvas.width, videoCanvas.height);
    video.style.display = 'block';
    restartArea.style.display = 'none';

    // BGMを再生
    playBGM();
};

const playBGM = () => {
    log("playBGM called");
    if (bgmAudio) {
        if (audioContext === null) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (!audioSources.bgm) {
            audioSources.bgm = audioContext.createMediaElementSource(bgmAudio);
            audioSources.bgm.connect(audioContext.destination);
        }
        bgmAudio.pause(); // まず停止
        bgmAudio.currentTime = 0; // 再生位置を初期化
        bgmAudio.play().catch(err => {
            log(`Error playing BGM: ${err.message}`);
        });
        isBgmPlayed = true; // BGM再生フラグを設定
    }
};

const stopBGM = () => {
    log("stopBGM called");
    if (bgmAudio) {
        bgmAudio.pause();
        bgmAudio.currentTime = 0;
        isBgmPlayed = false; // BGM再生フラグをリセット
    }
};

const playSound = (audio) => {
    if (audioContext === null) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (!audioSources[audio.src]) {
        audioSources[audio.src] = audioContext.createMediaElementSource(audio);
        audioSources[audio.src].connect(audioContext.destination);
    }
    audio.play().catch(err => {
        log(`Error playing sound: ${err.message}`);
    });
};

const drawBackground = (ctx, img) => {
    if (img) {
        log('Drawing background');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    } else {
        log('Background image not loaded');
    }
};

const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const drawTime = (ctx, time) => {
    const x = canvas.width / 2;
    const y = 30;
    ctx.fillStyle = 'white';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Time: ${formatTime(time)}`, x, y);
    log('Time drawn:', formatTime(time));
};

const getCanvasMousePosition = (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    return { x, y };
};

const getCanvasTouchPosition = (touch) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;
    return { x, y };
};

const initializeAudioContext = () => {
    if (audioContext === null) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (bgmAudio && !audioSources.bgm) {
        audioSources.bgm = audioContext.createMediaElementSource(bgmAudio);
        audioSources.bgm.connect(audioContext.destination);
    }
    Object.keys(comboSounds).forEach(key => {
        if (comboSounds[key] && !audioSources[comboSounds[key].src]) {
            audioSources[comboSounds[key].src] = audioContext.createMediaElementSource(comboSounds[key]);
            audioSources[comboSounds[key].src].connect(audioContext.destination);
        }
    });
};

document.addEventListener('mousedown', (event) => {
    if (!isBgmPlayed) { // ユーザーの最初の操作時にBGMを再生
        initializeAudioContext();
        playBGM();
    }

    if (isGameOver) return;
    const currentTime = Date.now();
    if (currentTime - lastBallTime >= 1000) {
        const { x } = getCanvasMousePosition(event);
        if (ballImages[nextBallType.radius]) {
            const newBall = createBall(x, 50, nextBallType.radius, ballImages[nextBallType.radius]);
            balls.push(newBall);
            nextBallType = BALL_TYPES[Math.floor(Math.random() * BALL_TYPES.length)];
            comboCount = 0;
            lastBallTime = currentTime;
            log('New ball created on mouse click');
        }
    }
});

document.addEventListener('touchstart', (event) => {
    if (!isBgmPlayed) { // ユーザーの最初の操作時にBGMを再生
        initializeAudioContext();
        playBGM();
    }

    if (isGameOver) return;
    const currentTime = Date.now();
    if (currentTime - lastBallTime >= 1000) {
        const touch = event.touches[0];
        const { x } = getCanvasTouchPosition(touch);
        if (ballImages[nextBallType.radius]) {
            const newBall = createBall(x, 50, nextBallType.radius, ballImages[nextBallType.radius]);
            balls.push(newBall);
            nextBallType = BALL_TYPES[Math.floor(Math.random() * BALL_TYPES.length)];
            comboCount = 0;
            lastBallTime = currentTime;
            log('New ball created on touch');
        }
    }
});

document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        resetGame();
        runner.enabled = true;
        isGameOver = false;
        requestAnimationFrame(mainLoop);
        log('Game restarted');
    }
    if (event.code === 'Enter') {
        gameOver();
    }
});

const drawScore = (ctx, score, x, y) => {
    const scoreStr = score.toString();
    for (let char of scoreStr) {
        const digit = parseInt(char);
        const img = scoreImages[digit];
        if (img) {
            ctx.drawImage(img, x, y, img.width, img.height);
            x += img.width + 5;
        }
    }
    log('Score drawn:', score);
};

const drawHighScores = (ctx, scores, x, y) => {
    if (!Array.isArray(scores)) {
        console.error('High scores is not an array:', scores);
        return;
    }

    ctx.fillStyle = 'white';  // 文字色を白に修正
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('スコアランキング', x, y);
    scores.slice(0, 3).forEach((score, index) => {
        ctx.fillText(`${index + 1}. ${Math.floor(score.score)}pt ${score.name}`, x, y + 30 + index * 30);
    });
    log('High scores drawn:', scores);
};

const drawNextBall = (ctx) => {
    if (ballImages[nextBallType.radius]) {
        const radius = nextBallType.radius;
        const x = canvas.width - radius;
        const y = 100;
        const img = ballImages[nextBallType.radius];
        ctx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2);
        log('Next ball drawn:', nextBallType.radius);
    }
};

const saveHighScore = (name, score) => {
    fetch('https://shinoariserver.onrender.com/highscores', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, score })
    })
    .then(response => response.json())
    .then(data => {
        console.log('High score saved:', data);
        fetchHighScores();
    })
    .catch(error => {
        console.error('Error saving high score:', error);
    });
};

const fetchHighScores = () => {
    fetch('https://shinoariserver.onrender.com/highscores')
        .then(response => response.json())
        .then(data => {
            highScores = Array.isArray(data) ? data : [];
            console.log('High scores fetched:', highScores);
        })
        .catch(error => {
            console.error('Error fetching high scores:', error);
        });
};

const drawRestartButtonArea = () => {
    restartArea.style.display = 'block';
    restartArea.addEventListener('click', handleRestartClick);
};

const handleRestartClick = () => {
    if (!isGameOver) return;
    resetGame();
    runner.enabled = true;
    isGameOver = false;
    requestAnimationFrame(mainLoop);
    log('Game restarted by clicking restart area');
    restartArea.style.display = 'none';
};

const drawFinalScore = (ctx, score) => {
    const x = canvas.width / 2;
    const y = canvas.height / 2;
    const scoreStr = score.toString();
    let totalWidth = 0;

    for (let char of scoreStr) {
        const digit = parseInt(char);
        const img = scoreImages[digit];
        if (img) {
            totalWidth += img.width + 5;
        }
    }

    let startX = x - totalWidth / 2;

    for (let char of scoreStr) {
        const digit = parseInt(char);
        const img = scoreImages[digit];
        if (img) {
            ctx.drawImage(img, startX, y - img.height / 2, img.width, img.height);
            startX += img.width + 5;
        }
    }
    log('Final score drawn:', score);
};

const fadeOutAudio = (audio, duration) => {
    const step = audio.volume / (duration / 100);
    const fade = setInterval(() => {
        if (audio.volume > step) {
            audio.volume -= step;
        } else {
            audio.volume = 0;
            audio.pause();
            clearInterval(fade);
        }
    }, 100);
};

const gameOver = () => {
    if (isGameOver) return;
    isGameOver = true;
    runner.enabled = false;
    elapsedTime = Date.now() - startTime;

    const thirdPlaceScore = highScores.length >= 3 ? highScores[2].score : 0;

    if (score > thirdPlaceScore) {
        const playerName = prompt('スコアランキング3位以内に入りました！名前を入力してください:');
        if (playerName) {
            saveHighScore(playerName, score);
        }
    }

    const ctx = canvas.getContext('2d');
    drawBackground(ctx, gameOverBackgroundImg);
    drawRestartButtonArea();

    stopBGM();

    // cutin関連の設定を無効化
    const video = document.getElementById('cutinVideo');
    video.style.display = 'none';
    videoCtx.clearRect(0, 0, videoCanvas.width, videoCanvas.height);

    log('Game over');
};

const mainLoop = () => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground(ctx, isGameOver ? gameOverBackgroundImg : backgroundImg);

    if (!isGameOver) {
        const scaleX = canvas.width / MAX_SCREEN_WIDTH;
        const scaleY = canvas.height / INIT_SCREEN_HEIGHT;

        balls.forEach(ball => {
            const posX = ball.position.x * scaleX;
            const posY = ball.position.y * scaleY;
            const radius = ball.circleRadius * scaleX;
            const img = ballImages[ball.circleRadius];
            if (img) {
                ctx.save();
                ctx.translate(posX, posY);
                ctx.rotate(ball.angle);
                ctx.drawImage(img, -radius, -radius, radius * 2, radius * 2);
                ctx.restore();
            }
        });

        drawScore(ctx, score, 10, 15);

        const currentTime = Date.now();
        const timeElapsed = currentTime - startTime;
        drawTime(ctx, timeElapsed);

        drawHighScores(ctx, highScores, 10, 70);

        drawNextBall(ctx);

        if (timeElapsed >= 60000) {
            gameOver();
        }
    } else {
        drawFinalScore(ctx, score);
    }

    requestAnimationFrame(mainLoop);
    log('Main loop running');
};

canvas.setAttribute('tabindex', 0);
canvas.focus();

Promise.all([
    loadImage('bg/0001.jpg').then(img => { backgroundImg = img; }),
    loadImage('bg/0002.jpg').then(img => { gameOverBackgroundImg = img; }).catch(err => log(`Error loading game over background image: ${err.message}`))
]).then(() => {
    return Promise.all(BALL_TYPES.map(type => loadImage(type.image)));
}).then(images => {
    images.forEach((img, index) => {
        ballImages[BALL_TYPES[index].radius] = img;
    });
    resizeCanvas();
    fetchHighScores();
    // 初回ロード時にはBGM再生を行わない
    requestAnimationFrame(mainLoop);
    log('Game started');
}).catch(err => {
    log(`Error loading images: ${err.message}`);
});
