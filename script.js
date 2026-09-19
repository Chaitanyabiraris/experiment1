// Neumorphic Ping Pong - script.js
// Controls:
//  - Left paddle: W / S
//  - Right paddle: ArrowUp / ArrowDown
// Features:
//  - Single player (CPU) or Two players
//  - Difficulty selection affects CPU speed
//  - Score tracking and reset
//  - Smooth game loop with fixed timestep
//  - Optimized rendering and audio

(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const startBtn = document.getElementById('startBtn');
  const resetBtn = document.getElementById('resetBtn');
  const modeSelect = document.getElementById('mode');
  const difficultySelect = document.getElementById('difficulty');
  const leftScoreEl = document.getElementById('leftScore');
  const rightScoreEl = document.getElementById('rightScore');
  const gameStatusEl = document.getElementById('gameStatus');

  const W = canvas.width;
  const H = canvas.height;
  const FPS = 60;
  const FRAME_TIME = 1000 / FPS;

  let running = false;
  let twoPlayer = false;
  let difficulty = 'normal';
  let gameActive = false;
  let serveCountdown = 0;

  const paddle = {
    w: 12,
    h: 80,
    left: { x: 20, y: H / 2 - 40, vy: 0, speed: 5.5 },
    right: { x: W - 32, y: H / 2 - 40, vy: 0, speed: 5.5 }
  };

  const ball = {
    x: W / 2,
    y: H / 2,
    r: 7,
    vx: 0,
    vy: 0,
    speed: 5,
    maxSpeed: 12
  };

  let leftScore = 0, rightScore = 0;

  const keys = {};
  window.addEventListener('keydown', e => { keys[e.code] = true; });
  window.addEventListener('keyup', e => { keys[e.code] = false; });

  let audioCtx = null;
  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  function beep(freq, time = 0.05, vol = 0.05) {
    try {
      if (!audioCtx) initAudio();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }

      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + time);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(audioCtx.currentTime);
      o.stop(audioCtx.currentTime + time);
    } catch (e) {
      // Silently fail if audio is not available
    }
  }

  function resetBall(direction = 0) {
    ball.x = W / 2;
    ball.y = H / 2;
    const dir = direction || (Math.random() < 0.5 ? -1 : 1);
    const angle = (Math.random() * Math.PI / 4) - (Math.PI / 8);
    ball.speed = 5;
    ball.vx = dir * ball.speed * Math.cos(angle);
    ball.vy = ball.speed * Math.sin(angle);
  }

  function clamp(val, a, b) {
    return Math.max(a, Math.min(b, val));
  }

  function serveStart() {
    resetBall();
    running = true;
    gameStatusEl.textContent = 'Game Running...';
  }

  function updateAI() {
    if (twoPlayer) return;

    let targetY = ball.y - paddle.right.h / 2;
    let maxSpeed = difficulty === 'easy' ? 2.5 : difficulty === 'hard' ? 5.5 : 3.8;

    if (difficulty === 'hard' && ball.vx > 0) {
      targetY = ball.y + (ball.vy * 8) - paddle.right.h / 2;
    }

    const diff = targetY - paddle.right.y;
    paddle.right.vy = clamp(diff * 0.08, -maxSpeed, maxSpeed);
    paddle.right.y += paddle.right.vy;
    paddle.right.y = clamp(paddle.right.y, 0, H - paddle.right.h);
  }

  function update(dt) {
    if (serveCountdown > 0) {
      serveCountdown--;
      if (serveCountdown === 0) {
        serveStart();
      }
      return;
    }

    if (keys['KeyW']) paddle.left.y -= paddle.left.speed;
    if (keys['KeyS']) paddle.left.y += paddle.left.speed;

    if (twoPlayer) {
      if (keys['ArrowUp']) paddle.right.y -= paddle.right.speed;
      if (keys['ArrowDown']) paddle.right.y += paddle.right.speed;
    }

    paddle.left.y = clamp(paddle.left.y, 0, H - paddle.left.h);
    paddle.right.y = clamp(paddle.right.y, 0, H - paddle.right.h);
    updateAI();

    // Keep the previous x position so fast-moving balls cannot pass through a paddle.
    const previousX = ball.x;
    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.y - ball.r < 0) {
      ball.y = ball.r;
      ball.vy *= -0.98;
      beep(800, 0.03, 0.03);
    } else if (ball.y + ball.r > H) {
      ball.y = H - ball.r;
      ball.vy *= -0.98;
      beep(800, 0.03, 0.03);
    }

    // Left paddle collision. The previous-position check prevents tunnelling.
    const hitsLeftPaddle =
      ball.vx < 0 &&
      previousX - ball.r >= paddle.left.x &&
      ball.x - ball.r <= paddle.left.x + paddle.w &&
      ball.y + ball.r >= paddle.left.y &&
      ball.y - ball.r <= paddle.left.y + paddle.h;

    if (hitsLeftPaddle) {
      ball.x = paddle.left.x + paddle.w + ball.r;
      const rel = (ball.y - (paddle.left.y + paddle.h / 2)) / (paddle.h / 2);
      const bounceAngle = rel * (Math.PI / 2.5);
      ball.speed = Math.min(ball.speed * 1.05, ball.maxSpeed);
      ball.vx = Math.abs(ball.speed * Math.cos(bounceAngle));
      ball.vy = ball.speed * Math.sin(bounceAngle);
      beep(1200, 0.04, 0.04);
    }

    // Right paddle collision. The previous-position check prevents tunnelling.
    const hitsRightPaddle =
      ball.vx > 0 &&
      previousX + ball.r <= paddle.right.x &&
      ball.x + ball.r >= paddle.right.x &&
      ball.y + ball.r >= paddle.right.y &&
      ball.y - ball.r <= paddle.right.y + paddle.h;

    if (hitsRightPaddle) {
      ball.x = paddle.right.x - ball.r;
      const rel = (ball.y - (paddle.right.y + paddle.h / 2)) / (paddle.h / 2);
      const bounceAngle = rel * (Math.PI / 2.5);
      ball.speed = Math.min(ball.speed * 1.05, ball.maxSpeed);
      ball.vx = -Math.abs(ball.speed * Math.cos(bounceAngle));
      ball.vy = ball.speed * Math.sin(bounceAngle);
      beep(1200, 0.04, 0.04);
    }

    if (ball.x < 0) {
      rightScore += 1;
      rightScoreEl.textContent = rightScore;
      beep(400, 0.1, 0.05);
      running = false;
      gameStatusEl.textContent = 'Player 2 Scored! Serving...';
      resetBall(1);
      serveCountdown = FPS;
    } else if (ball.x > W) {
      leftScore += 1;
      leftScoreEl.textContent = leftScore;
      beep(400, 0.1, 0.05);
      running = false;
      gameStatusEl.textContent = 'Player 1 Scored! Serving...';
      resetBall(-1);
      serveCountdown = FPS;
    }
  }

  function render() {
    ctx.fillStyle = '#f0f3f7';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(163, 177, 198, 0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#6c5ce7';
    ctx.shadowColor = 'rgba(163, 177, 198, 0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillRect(paddle.left.x, paddle.left.y, paddle.w, paddle.h);
    ctx.fillRect(paddle.right.x, paddle.right.y, paddle.w, paddle.h);
    ctx.shadowColor = 'transparent';

    ctx.fillStyle = '#6c5ce7';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(108, 92, 231, 0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r + 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  let lastTime = performance.now();
  let accumulator = 0;

  function loop(now) {
    const deltaTime = Math.min(now - lastTime, 50);
    lastTime = now;
    accumulator += deltaTime;

    while (accumulator >= FRAME_TIME) {
      if (running || serveCountdown > 0) {
        update(FRAME_TIME / 1000);
      }
      accumulator -= FRAME_TIME;
    }

    render();
    requestAnimationFrame(loop);
  }

  startBtn.addEventListener('click', () => {
    twoPlayer = modeSelect.value === 'two';
    difficulty = difficultySelect.value;

    paddle.left.y = H / 2 - paddle.left.h / 2;
    paddle.right.y = H / 2 - paddle.right.h / 2;
    leftScore = 0;
    rightScore = 0;
    leftScoreEl.textContent = leftScore;
    rightScoreEl.textContent = rightScore;

    if (difficulty === 'easy') {
      paddle.left.speed = 4.8;
      paddle.right.speed = 3.5;
    } else if (difficulty === 'hard') {
      paddle.left.speed = 6.2;
      paddle.right.speed = 5.5;
    } else {
      paddle.left.speed = 5.5;
      paddle.right.speed = 4.5;
    }

    initAudio();
    gameActive = true;
    gameStatusEl.textContent = 'Get ready...';
    resetBall();
    serveCountdown = FPS;
    requestAnimationFrame(loop);
  });

  resetBtn.addEventListener('click', () => {
    leftScore = 0;
    rightScore = 0;
    leftScoreEl.textContent = leftScore;
    rightScoreEl.textContent = rightScore;
    gameStatusEl.textContent = 'Scores reset. Click "Start Game" to begin';
  });

  resetBall();
  render();
  requestAnimationFrame(loop);
})();
