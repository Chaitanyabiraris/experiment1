// Retro Ping Pong - script.js
// Controls:
//  - Left paddle: W / S
//  - Right paddle: ArrowUp / ArrowDown
// Features:
//  - Single player (CPU) or Two players
//  - Difficulty selection affects CPU speed
//  - Score tracking and reset
//  - Simple sound effects

(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const startBtn = document.getElementById('startBtn');
  const resetBtn = document.getElementById('resetBtn');
  const modeSelect = document.getElementById('mode');
  const difficultySelect = document.getElementById('difficulty');
  const leftScoreEl = document.getElementById('leftScore');
  const rightScoreEl = document.getElementById('rightScore');

  const W = canvas.width;
  const H = canvas.height;

  // Game state
  let running = false;
  let twoPlayer = false;
  let difficulty = 'normal';

  // Paddles
  const paddle = {
    w: 10,
    h: 60,
    left: { x: 20, y: H/2 - 30, vy: 0, speed: 4.5 },
    right: { x: W - 30, y: H/2 - 30, vy: 0, speed: 4.5 }
  };

  // Ball
  const ball = {
    x: W/2,
    y: H/2,
    r: 5,
    vx: 0,
    vy: 0,
    speed: 4
  };

  // Scores
  let leftScore = 0, rightScore = 0;

  // Input
  const keys = {};
  window.addEventListener('keydown', e => { keys[e.code] = true; });
  window.addEventListener('keyup', e => { keys[e.code] = false; });

  // Sound (simple oscillator beeps)
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  function beep(freq, time = 0.06, vol = 0.08) {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'square';
    o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + time);
  }

  function resetBall(direction = 0) {
    ball.x = W/2; ball.y = H/2;
    // direction: -1 left, 1 right, 0 random
    const dir = direction || (Math.random() < 0.5 ? -1 : 1);
    const angle = (Math.random() * Math.PI/4) - (Math.PI/8); // -22.5deg..22.5deg
    ball.speed = 4;
    ball.vx = dir * ball.speed * Math.cos(angle);
    ball.vy = ball.speed * Math.sin(angle);
  }

  function clamp(val, a, b) { return Math.max(a, Math.min(b, val)); }

  function serveStart() {
    resetBall();
    running = true;
  }

  function updateAI() {
    if (twoPlayer) return;
    let targetY = ball.y - paddle.right.h/2;
    // difficulty adjusts max speed and reaction
    let maxSpeed = difficulty === 'easy' ? 2.2 : difficulty === 'hard' ? 5.2 : 3.4;
    // AI slightly anticipates on higher difficulty
    if (difficulty === 'hard') targetY = ball.y + (ball.vy * 10) - paddle.right.h/2;
    const diff = targetY - paddle.right.y;
    paddle.right.vy = clamp(diff * 0.12, -maxSpeed, maxSpeed);
    paddle.right.y += paddle.right.vy;
    paddle.right.y = clamp(paddle.right.y, 0, H - paddle.right.h);
  }

  function update(dt) {
    // Player controls
    // left: W (KeyW) up, S (KeyS) down
    if (keys['KeyW']) paddle.left.y -= paddle.left.speed;
    if (keys['KeyS']) paddle.left.y += paddle.left.speed;
    // right: ArrowUp ArrowDown (only in twoPlayer)
    if (twoPlayer) {
      if (keys['ArrowUp']) paddle.right.y -= paddle.right.speed;
      if (keys['ArrowDown']) paddle.right.y += paddle.right.speed;
    }
    paddle.left.y = clamp(paddle.left.y, 0, H - paddle.left.h);
    paddle.right.y = clamp(paddle.right.y, 0, H - paddle.right.h);

    // AI update (if single)
    updateAI();

    // Ball movement
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Top/bottom collision
    if (ball.y - ball.r < 0) {
      ball.y = ball.r; ball.vy *= -1; beep(900, 0.03);
    } else if (ball.y + ball.r > H) {
      ball.y = H - ball.r; ball.vy *= -1; beep(900, 0.03);
    }

    // Paddle collisions (AABB circle check simplified)
    // Left paddle
    if (ball.x - ball.r < paddle.left.x + paddle.w &&
        ball.x > paddle.left.x &&
        ball.y > paddle.left.y &&
        ball.y < paddle.left.y + paddle.h) {
      ball.x = paddle.left.x + paddle.w + ball.r;
      const rel = (ball.y - (paddle.left.y + paddle.h/2)) / (paddle.left.h/2);
      const bounceAngle = rel * (Math.PI/3); // up to 60 deg
      const dir = 1;
      ball.speed *= 1.03;
      const maxSpeed = 10;
      ball.vx = dir * Math.min(ball.speed * Math.cos(bounceAngle), maxSpeed);
      ball.vy = ball.speed * Math.sin(bounceAngle);
      beep(1200, 0.04);
    }

    // Right paddle
    if (ball.x + ball.r > paddle.right.x &&
        ball.x < paddle.right.x + paddle.w &&
        ball.y > paddle.right.y &&
        ball.y < paddle.right.y + paddle.h) {
      ball.x = paddle.right.x - ball.r;
      const rel = (ball.y - (paddle.right.y + paddle.right.h/2)) / (paddle.right.h/2);
      const bounceAngle = rel * (Math.PI/3);
      const dir = -1;
      ball.speed *= 1.03;
      const maxSpeed = 10;
      ball.vx = dir * Math.min(ball.speed * Math.cos(bounceAngle), maxSpeed);
      ball.vy = ball.speed * Math.sin(bounceAngle);
      beep(1200, 0.04);
    }

    // Score
    if (ball.x < 0) {
      // right scores
      rightScore += 1; rightScoreEl.textContent = rightScore;
      beep(220, 0.08, 0.12);
      running = false;
      resetBall(1);
      setTimeout(() => { if (!running) serveStart(); }, 600);
    } else if (ball.x > W) {
      leftScore += 1; leftScoreEl.textContent = leftScore;
      beep(220, 0.08, 0.12);
      running = false;
      resetBall(-1);
      setTimeout(() => { if (!running) serveStart(); }, 600);
    }
  }

  function drawNet() {
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    const step = 12;
    for (let y = 0; y < H; y += step) {
      ctx.fillRect(W/2 - 1, y + 4, 2, 6);
    }
  }

  function drawRetro() {
    // Background grid glow
    ctx.fillStyle = '#00161b';
    ctx.fillRect(0,0,W,H);
    // Add vignette / noise feel with subtle rectangles
    ctx.globalAlpha = 0.06;
    for (let i=0;i<3;i++){
      ctx.fillStyle = i%2 ? '#042a2e' : '#001f24';
      ctx.fillRect(i*20, 0, 10, H);
    }
    ctx.globalAlpha = 1;
  }

  function render() {
    // Clear
    drawRetro();

    // Net
    drawNet();

    // Paddles
    ctx.fillStyle = '#4fffd6';
    // left
    ctx.fillRect(Math.floor(paddle.left.x), Math.floor(paddle.left.y), paddle.w, paddle.h);
    // right
    ctx.fillRect(Math.floor(paddle.right.x), Math.floor(paddle.right.y), paddle.w, paddle.h);

    // Ball (draw as square for retro look)
    ctx.fillStyle = '#bff7ef';
    const br = Math.max(2, Math.round(ball.r*2));
    ctx.fillRect(Math.round(ball.x - br/2), Math.round(ball.y - br/2), br, br);

    // Scores handled in DOM; but draw small HUD
    // small center text for paused state
    if (!running) {
      ctx.fillStyle = 'rgba(191,247,239,0.08)';
      ctx.fillRect(W/2 - 120, H/2 - 30, 240, 60);
      ctx.fillStyle = '#bff7ef';
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED / WAITING', W/2, H/2 - 2);
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText('Press Start to play', W/2, H/2 + 18);
    }
  }

  // Main loop
  let last = performance.now();
  function loop(now) {
    const dt = (now - last) / 1000;
    last = now;
    if (running) update(dt);
    render();
    requestAnimationFrame(loop);
  }

  // UI bindings
  startBtn.addEventListener('click', () => {
    twoPlayer = modeSelect.value === 'two';
    difficulty = difficultySelect.value;
    // reset positions and ball
    paddle.left.y = H/2 - paddle.left.h/2;
    paddle.right.y = H/2 - paddle.right.h/2;
    leftScore = 0; rightScore = 0;
    leftScoreEl.textContent = leftScore; rightScoreEl.textContent = rightScore;
    // small changes for difficulty
    if (difficulty === 'easy') { paddle.left.speed = 4.6; paddle.right.speed = 3.2; }
    else if (difficulty === 'hard') { paddle.left.speed = 5.2; paddle.right.speed = 4.8; }
    else { paddle.left.speed = 4.6; paddle.right.speed = 4.0; }
    // Start audio context resume for user gesture compliance
    audioCtx.resume().catch(() => {});
    serveStart();
  });

  resetBtn.addEventListener('click', () => {
    leftScore = 0; rightScore = 0;
    leftScoreEl.textContent = leftScore; rightScoreEl.textContent = rightScore;
  });

  // Start the render loop
  requestAnimationFrame(loop);

  // initial paint and ball
  resetBall();
  render();
})();
