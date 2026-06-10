const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const nameInput = document.getElementById('nameInput');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const livesEl = document.getElementById('lives');
const highscoresEl = document.getElementById('highscores');

const BACKEND_URL = window.BACKEND_URL || '';

// ── Spielzustand ──────────────────────────────────────────────
let player, bullets, enemies, particles, score, lives, level;
let gameRunning = false;
let animId;
let keys = {};
let enemySpawnTimer = 0;
let shootCooldown = 0;

// ── Hilfsfunktionen ───────────────────────────────────────────
function randomBetween(a, b) { return Math.random() * (b - a) + a; }

function heart(n) { return '❤️'.repeat(n) || '💀'; }

// ── Partikel ──────────────────────────────────────────────────
function spawnParticles(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: randomBetween(-3, 3),
      vy: randomBetween(-3, 3),
      life: 1,
      color
    });
  }
}

// ── Sterne (Hintergrund) ──────────────────────────────────────
const stars = Array.from({ length: 100 }, () => ({
  x: Math.random() * 600,
  y: Math.random() * 600,
  r: Math.random() * 1.5 + 0.5,
  speed: Math.random() * 0.5 + 0.1
}));

function drawStars() {
  ctx.fillStyle = '#ffffff33';
  stars.forEach(s => {
    s.y += s.speed;
    if (s.y > 600) { s.y = 0; s.x = Math.random() * 600; }
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ── Spieler ───────────────────────────────────────────────────
function createPlayer() {
  return { x: 300, y: 540, w: 36, h: 36, speed: 5, invincible: 0 };
}

function drawPlayer() {
  if (player.invincible > 0 && Math.floor(player.invincible / 5) % 2 === 0) return;
  ctx.save();
  ctx.translate(player.x, player.y);
  // Rumpf
  ctx.fillStyle = '#00ffff';
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(14, 16);
  ctx.lineTo(0, 8);
  ctx.lineTo(-14, 16);
  ctx.closePath();
  ctx.fill();
  // Triebwerk
  ctx.fillStyle = '#ff6600';
  ctx.beginPath();
  ctx.moveTo(-8, 16);
  ctx.lineTo(8, 16);
  ctx.lineTo(0, 28);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ── Schüsse ───────────────────────────────────────────────────
function shoot() {
  if (shootCooldown > 0) return;
  bullets.push({ x: player.x, y: player.y - 20, w: 4, h: 14, speed: 10 });
  shootCooldown = 15;
}

function drawBullets() {
  bullets.forEach(b => {
    ctx.fillStyle = '#ffff00';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ffff00';
    ctx.fillRect(b.x - 2, b.y, b.w, b.h);
    ctx.shadowBlur = 0;
  });
}

// ── Gegner ────────────────────────────────────────────────────
function spawnEnemy() {
  const types = ['basic', 'fast', 'tank'];
  const weights = level < 3 ? [0.8, 0.15, 0.05] : level < 6 ? [0.5, 0.3, 0.2] : [0.3, 0.4, 0.3];
  const r = Math.random();
  let type = types[0];
  if (r > weights[0] + weights[1]) type = types[2];
  else if (r > weights[0]) type = types[1];

  const configs = {
    basic: { w: 32, h: 32, speed: 0.8 + level * 0.1, hp: 1, color: '#ff4444', score: 10 },
    fast:  { w: 24, h: 24, speed: 1.8 + level * 0.15, hp: 1, color: '#ff9900', score: 20 },
    tank:  { w: 40, h: 40, speed: 0.5 + level * 0.05, hp: 3, color: '#cc44ff', score: 50 }
  };
  const cfg = configs[type];
  enemies.push({
    x: randomBetween(cfg.w, 600 - cfg.w),
    y: -cfg.h,
    type, ...cfg
  });
}

function drawEnemies() {
  enemies.forEach(e => {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.fillStyle = e.color;
    if (e.type === 'tank') {
      // Schildkrötenform
      ctx.beginPath();
      ctx.ellipse(0, 0, e.w / 2, e.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff55';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      // Dreieck-Gegner (nach unten zeigend)
      ctx.beginPath();
      ctx.moveTo(0, e.h / 2);
      ctx.lineTo(e.w / 2, -e.h / 2);
      ctx.lineTo(-e.w / 2, -e.h / 2);
      ctx.closePath();
      ctx.fill();
    }
    // HP-Balken bei Tank
    if (e.type === 'tank' && e.hp < 3) {
      ctx.fillStyle = '#333';
      ctx.fillRect(-18, -28, 36, 5);
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(-18, -28, 36 * (e.hp / 3), 5);
    }
    ctx.restore();
  });
}

// ── Partikel zeichnen ─────────────────────────────────────────
function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ── Kollision ─────────────────────────────────────────────────
function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax - aw / 2 < bx + bw / 2 &&
         ax + aw / 2 > bx - bw / 2 &&
         ay - ah / 2 < by + bh / 2 &&
         ay + ah / 2 > by - bh / 2;
}

// ── Game Loop ─────────────────────────────────────────────────
function update() {
  // Spieler bewegen
  if (keys['ArrowLeft'] || keys['a'])  player.x = Math.max(20, player.x - player.speed);
  if (keys['ArrowRight'] || keys['d']) player.x = Math.min(580, player.x + player.speed);
  if (keys[' '] || keys['ArrowUp'])    shoot();

  if (shootCooldown > 0) shootCooldown--;
  if (player.invincible > 0) player.invincible--;

  // Gegner spawnen
  const spawnRate = Math.max(30, 80 - level * 5);
  enemySpawnTimer++;
  if (enemySpawnTimer >= spawnRate) {
    spawnEnemy();
    enemySpawnTimer = 0;
  }

  // Schüsse bewegen
  bullets.forEach(b => b.y -= b.speed);
  bullets = bullets.filter(b => b.y > -20);

  // Gegner bewegen
  enemies.forEach(e => e.y += e.speed);

  // Schuss-Gegner Kollision
  bullets = bullets.filter(bullet => {
    let hit = false;
    enemies = enemies.filter(e => {
      if (rectsOverlap(bullet.x, bullet.y, 4, 14, e.x, e.y, e.w, e.h)) {
        e.hp--;
        hit = true;
        spawnParticles(e.x, e.y, e.color, 6);
        if (e.hp <= 0) {
          score += e.score * level;
          scoreEl.textContent = score;
          spawnParticles(e.x, e.y, e.color, 16);
          // Level up alle 500 Punkte
          const newLevel = Math.floor(score / 500) + 1;
          if (newLevel > level) {
            level = newLevel;
            levelEl.textContent = level;
          }
          return false;
        }
      }
      return true;
    });
    return !hit;
  });

  // Gegner erreichen Spieler oder Boden
  enemies = enemies.filter(e => {
    if (e.y > 620) {
      if (player.invincible === 0) {
        lives--;
        livesEl.textContent = heart(lives);
        player.invincible = 90;
        spawnParticles(player.x, player.y, '#ff0000', 20);
        if (lives <= 0) { endGame(); return false; }
      }
      return false;
    }
    // Kollision mit Spieler
    if (player.invincible === 0 && rectsOverlap(player.x, player.y, 30, 30, e.x, e.y, e.w, e.h)) {
      lives--;
      livesEl.textContent = heart(lives);
      player.invincible = 90;
      spawnParticles(e.x, e.y, e.color, 16);
      if (lives <= 0) { endGame(); return false; }
      return false;
    }
    return true;
  });

  // Partikel updaten
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.03;
  });
  particles = particles.filter(p => p.life > 0);
}

function draw() {
  ctx.clearRect(0, 0, 600, 600);
  drawStars();
  drawParticles();
  drawBullets();
  drawEnemies();
  drawPlayer();
}

function loop() {
  if (!gameRunning) return;
  update();
  draw();
  animId = requestAnimationFrame(loop);
}

// ── Spiel starten / beenden ───────────────────────────────────
function startGame() {
  player = createPlayer();
  bullets = [];
  enemies = [];
  particles = [];
  score = 0;
  lives = 3;
  level = 1;
  enemySpawnTimer = 0;
  shootCooldown = 0;
  scoreEl.textContent = '0';
  levelEl.textContent = '1';
  livesEl.textContent = heart(3);
  gameRunning = true;
  overlay.style.display = 'none';
  loop();
}

async function endGame() {
  gameRunning = false;
  cancelAnimationFrame(animId);

  const name = nameInput.value.trim() || 'Anonym';
  try {
    await fetch(`${BACKEND_URL}/api/highscores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score })
    });
  } catch (e) { console.warn('Highscore konnte nicht gespeichert werden'); }

  await loadHighscores();

  overlay.style.display = 'flex';
  overlay.querySelector('h1').textContent = 'GAME OVER';
  overlay.querySelector('p').textContent = `Dein Score: ${score} | Level: ${level}`;
  startBtn.textContent = 'NOCHMAL';
}

async function loadHighscores() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/highscores`);
    const data = await res.json();
    highscoresEl.innerHTML = `<h3>🏆 HIGHSCORES</h3>` +
      data.slice(0, 5).map((h, i) =>
        `${i + 1}. ${h.name} — ${h.score}`
      ).join('<br>');
  } catch (e) {
    highscoresEl.innerHTML = '';
  }
}

// ── Events ────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === ' ') e.preventDefault();
});
window.addEventListener('keyup', e => keys[e.key] = false);
startBtn.addEventListener('click', startGame);

loadHighscores();
