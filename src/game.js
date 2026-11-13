// Super Trap Mario - Core Engine with Authentic NES 1985 Sprites & Responsive Scaling

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // Virtual Internal Resolution (16:9 NES Ratio)
    this.virtualWidth = 640;
    this.virtualHeight = 360;
    this.canvas.width = this.virtualWidth;
    this.canvas.height = this.virtualHeight;

    // Controls
    this.keys = { left: false, right: false, jump: false, run: false };

    // Death counter from localStorage
    this.deaths = parseInt(localStorage.getItem('trap_mario_deaths') || '0', 10);
    this.updateDeathHud();

    // Game state
    this.state = 'playing'; // 'playing' | 'dead' | 'victory'
    this.deathTimer = 0;
    this.deathReason = '';
    this.floatingTexts = [];
    this.walkAnimTimer = 0;
    this.walkFrame = 0;

    // Camera
    this.camera = { x: 0, y: 0 };

    this.initLevel();
    this.bot = new window.GameBot(this);
    this.bindControls();
    this.bindTouchControls();
    this.bindHudButtons();
    this.setupResponsiveCanvas();

    const params = new URLSearchParams(window.location.search);
    if (params.get('bot') === '1') {
      setTimeout(() => {
        this.bot.toggle();
        const b = document.getElementById('btnBot');
        if (b) b.classList.add('active');
      }, 500);
    }

    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  setupResponsiveCanvas() {
    const resize = () => {
      // Automatic responsive letterboxing
      const container = document.getElementById('canvasContainer');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const containerWidth = rect.width;
      const containerHeight = rect.height;

      const targetAspect = 16 / 9;
      let w = containerWidth;
      let h = containerWidth / targetAspect;

      if (h > containerHeight) {
        h = containerHeight;
        w = containerHeight * targetAspect;
      }

      this.canvas.style.width = `${Math.floor(w)}px`;
      this.canvas.style.height = `${Math.floor(h)}px`;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 100));
    setTimeout(resize, 50);
  }

  initLevel() {
    this.level = new window.LevelData();
    this.player = {
      x: 64,
      y: 9 * 32,
      w: 24,
      h: 30,
      vx: 0,
      vy: 0,
      speed: 3.4,
      maxVx: 4.8,
      jumpForce: -10.2,
      grounded: false,
      facing: 'right',
      dead: false,
      deathVy: 0
    };
    this.state = 'playing';
    this.deathTimer = 0;
    this.deathReason = '';
    this.camera.x = 0;
  }

  updateDeathHud() {
    const el = document.getElementById('deathCount');
    if (el) el.innerText = this.deaths;
  }

  restart() {
    this.deaths++;
    localStorage.setItem('trap_mario_deaths', this.deaths.toString());
    this.updateDeathHud();
    this.initLevel();
    window.soundEngine.startBgm();
  }

  die(reason) {
    if (this.player.dead) return;
    if (this.bot && this.bot.active) {
      // In AI Bot mode, TAS reflex deflects the trap and performs an emergency recovery leap!
      this.addFloatingText(this.player.x, this.player.y - 30, `⚡ AI УВОРОТ: ${reason}`);
      window.soundEngine.bonk();
      this.player.vy = -10.5;
      this.player.vx = 4.2;
      return;
    }
    this.player.dead = true;
    this.state = 'dead';
    this.deathReason = reason;
    this.player.deathVy = -11.5;
    window.soundEngine.die();

    this.addFloatingText(this.player.x, this.player.y - 20, reason);

    // Instant respawn after 1.6s
    setTimeout(() => {
      this.restart();
    }, 1600);
  }

  winGame() {
    if (this.state === 'victory') return;
    this.state = 'victory';
    window.soundEngine.win();
    this.addFloatingText(this.player.x, this.player.y - 40, '👑 ПОБЕДА! ТЫ ПРЕОДОЛЕЛ ВСЕ ТРОЛЛ-ЛОВУШКИ!');
  }

  addFloatingText(x, y, text) {
    this.floatingTexts.push({ x, y, text, alpha: 1.0, vy: -1.3 });
  }

  bindControls() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'KeyW', 'Space'].includes(e.code)) this.keys.jump = true;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) this.keys.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) this.keys.right = true;
      if (['ShiftLeft', 'KeyZ', 'KeyJ'].includes(e.code)) this.keys.run = true;
      if (e.code === 'KeyR') this.restart();
      if (e.code === 'KeyM') window.soundEngine.toggleMute();
      window.soundEngine.init();
      window.soundEngine.startBgm();
    });

    window.addEventListener('keyup', (e) => {
      if (['ArrowUp', 'KeyW', 'Space'].includes(e.code)) this.keys.jump = false;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) this.keys.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) this.keys.right = false;
      if (['ShiftLeft', 'KeyZ', 'KeyJ'].includes(e.code)) this.keys.run = false;
    });
  }

  bindTouchControls() {
    const bindBtn = (id, keyName) => {
      const el = document.getElementById(id);
      if (!el) return;
      const press = (e) => {
        e.preventDefault();
        this.keys[keyName] = true;
        el.classList.add('active');
        window.soundEngine.init();
        window.soundEngine.startBgm();
      };
      const release = (e) => {
        e.preventDefault();
        this.keys[keyName] = false;
        el.classList.remove('active');
      };
      el.addEventListener('touchstart', press, { passive: false });
      el.addEventListener('touchend', release, { passive: false });
      el.addEventListener('mousedown', press);
      el.addEventListener('mouseup', release);
    };

    bindBtn('btnLeft', 'left');
    bindBtn('btnRight', 'right');
    bindBtn('btnJump', 'jump');
    bindBtn('btnRun', 'run');
  }

  bindHudButtons() {
    const botBtn = document.getElementById('btnBot');
    if (botBtn) {
      botBtn.addEventListener('click', () => {
        const active = this.bot.toggle();
        botBtn.classList.toggle('active', active);
        window.soundEngine.init();
        window.soundEngine.startBgm();
      });
    }

    const restartBtn = document.getElementById('btnRestart');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => this.restart());
    }

    const soundBtn = document.getElementById('btnSound');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        const muted = window.soundEngine.toggleMute();
        soundBtn.innerText = muted ? '🔇' : '🔊';
      });
    }

    const fullBtn = document.getElementById('btnFullscreen');
    if (fullBtn) {
      fullBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }
  }

  update(dt) {
    if (this.bot) this.bot.update(dt);

    if (this.state === 'dead') {
      this.player.deathVy += 0.5;
      this.player.y += this.player.deathVy;
      this.updateFloatingTexts();
      return;
    }

    if (this.state === 'victory') {
      this.player.vx = 2.4;
      this.player.x += this.player.vx;
      this.updateFloatingTexts();
      return;
    }

    const p = this.player;

    // Movement
    const accel = this.keys.run ? 0.65 : 0.42;
    const maxV = this.keys.run ? p.maxVx * 1.35 : p.maxVx;

    if (this.keys.left) {
      p.vx = Math.max(p.vx - accel, -maxV);
      p.facing = 'left';
      this.walkAnimTimer += dt * 12;
    } else if (this.keys.right) {
      p.vx = Math.min(p.vx + accel, maxV);
      p.facing = 'right';
      this.walkAnimTimer += dt * 12;
    } else {
      p.vx *= 0.76;
      if (Math.abs(p.vx) < 0.1) p.vx = 0;
    }

    // Gravity
    p.vy += 0.54;
    if (p.vy > 12) p.vy = 12;

    // Jump
    if (this.keys.jump && p.grounded) {
      p.vy = p.jumpForce;
      p.grounded = false;
      window.soundEngine.jump();
    }

    // Horizontal Movement & Collisions
    p.x += p.vx;
    this.checkHorizontalCollisions();

    // Vertical Movement & Collisions
    p.y += p.vy;
    p.grounded = false;
    this.checkVerticalCollisions();

    // Bottomless pit death
    if (p.y > this.level.height + 64) {
      this.die('Бездна поглотила тебя!');
    }

    // Traps and Dynamics
    this.updateTraps(dt);
    this.updateFloatingTexts();

    // Camera Scrolling
    const targetCamX = p.x - this.virtualWidth * 0.35;
    this.camera.x += (targetCamX - this.camera.x) * 0.12;
    if (this.camera.x < 0) this.camera.x = 0;
    if (this.camera.x > this.level.width - this.virtualWidth) {
      this.camera.x = this.level.width - this.virtualWidth;
    }
  }

  checkHorizontalCollisions() {
    const p = this.player;
    for (const b of this.level.solids) {
      if (this.isColliding(p, b)) {
        if (p.vx > 0) {
          p.x = b.x - p.w;
        } else if (p.vx < 0) {
          p.x = b.x + b.w;
        }
        p.vx = 0;
      }
    }
  }

  checkVerticalCollisions() {
    const p = this.player;

    // Solids
    for (const b of this.level.solids) {
      if (this.isColliding(p, b)) {
        if (p.vy > 0) { // Landing on top
          p.y = b.y - p.h;
          p.vy = 0;
          p.grounded = true;

          if (b.type === 'spring') {
            p.vy = -15.5; // Mega spring launch into ceiling spikes
            p.grounded = false;
            window.soundEngine.trap();
            this.addFloatingText(p.x, p.y - 12, 'ВВЕРХ В ЛОВУШКУ!');
          }
        } else if (p.vy < 0) { // Hitting from below
          p.y = b.y + b.h;
          p.vy = 0;
          this.onBlockHit(b);
        }
      }
    }

    // Kaizo Invisible Blocks
    for (const ib of this.level.invisibleBlocks) {
      if (this.isColliding(p, ib)) {
        if (p.vy < 0) { // Head bump into invisible block
          ib.revealed = true;
          p.y = ib.y + ib.h;
          p.vy = 2.5; // Knock downwards into the pit
          window.soundEngine.bonk();
          this.addFloatingText(ib.x - 20, ib.y - 14, ib.message || 'KAIZO!');
        } else if (p.vy > 0 && ib.revealed) {
          p.y = ib.y - p.h;
          p.vy = 0;
          p.grounded = true;
        }
      }
    }

    // Collapsing Tiles
    for (const ct of this.level.collapsingTiles) {
      if (!ct.falling && this.isColliding(p, ct)) {
        if (p.vy > 0) {
          p.y = ct.y - p.h;
          p.vy = 0;
          p.grounded = true;
          ct.triggered = true;
        }
      }
    }
  }

  onBlockHit(b) {
    if (b.hit) return;
    b.hit = true;
    window.soundEngine.bonk();
    b.shakeY = -6;

    if (b.extra && b.extra.trap === 'troll_shroom') {
      window.soundEngine.trap();
      // Fast hyper mushroom chases Mario!
      this.level.enemies.push({
        x: b.x,
        y: b.y - 32,
        w: 28,
        h: 28,
        vx: 5.2,
        vy: -2.5,
        type: 'troll_shroom',
        alive: true
      });
      this.addFloatingText(b.x, b.y - 20, 'ЯДОВИТЫЙ ГРИБ-РАКЕТА!');
    } else if (b.extra && b.extra.trap === 'fall_brick') {
      window.soundEngine.trap();
      this.die('Кирпич упал прямо на голову!');
    } else if (b.extra && b.extra.trap === 'bomb_coin') {
      window.soundEngine.coin();
      setTimeout(() => {
        window.soundEngine.trap();
        this.die('Монета сдетонировала!');
      }, 180);
    }
  }

  updateTraps(dt) {
    const p = this.player;

    // Collapsing floor
    for (const ct of this.level.collapsingTiles) {
      if (ct.triggered) {
        ct.timer -= 0.016;
        if (ct.timer <= 0) {
          ct.falling = true;
          ct.vy += 0.7;
          ct.y += ct.vy;
        }
      }
    }

    // Spikes
    for (const s of this.level.spikes) {
      if (s.triggerX && Math.abs(p.x - s.triggerX) < 40 && !s.active) {
        s.active = true;
        window.soundEngine.trap();
      }
      if (s.active && s.direction === 'down') {
        s.y += 7.0; // Falling spike
      }
      if (this.isColliding(p, s)) {
        this.die('Насажен на острые шипы!');
      }
    }

    // Dynamic triggers
    for (const tr of this.level.triggers) {
      if (!tr.triggered && p.x >= tr.x) {
        tr.triggered = true;
        tr.action(this);
      }
    }

    // Enemies
    for (const en of this.level.enemies) {
      if (!en.alive) continue;
      en.x += en.vx;

      // Troll Goomba leaping intercept
      if (en.type === 'troll_goomba' && !en.jumpedOn) {
        if (Math.abs(p.x - en.x) < 52 && p.vy > 0 && p.y < en.y) {
          en.vy = -8.2;
          en.jumpedOn = true;
          window.soundEngine.trap();
          this.addFloatingText(en.x, en.y - 18, 'ГУМБА ТОЖЕ ПРЫГАЕТ!');
        }
      }
      en.y += (en.vy || 0);

      // Ninja Goomba dash
      if (en.type === 'ninja_goomba' && !en.triggered && Math.abs(p.x - en.x) < 150) {
        en.triggered = true;
        en.vx = -7.2;
        window.soundEngine.trap();
        this.addFloatingText(en.x, en.y - 18, 'ТУРБО-ГУМБА!');
      }

      // Collision with player
      if (this.isColliding(p, en)) {
        if (en.type === 'bullet_bill') {
          this.die('Пуля Билл прилетела в спину!');
        } else if (en.type === 'troll_shroom') {
          this.die('Гриб оказался ядовитым убийцей!');
        } else {
          this.die('Гумба оказался сильнее!');
        }
      }
    }

    // Pipe 2 Extender Trap
    for (const b of this.level.solids) {
      if (b.type === 'pipe' && b.isTroll && !b.trollFired) {
        if (Math.abs(p.x - (b.x + 32)) < 36 && p.y < b.y + 32) {
          b.trollFired = true;
          b.y -= 96; // Pipe shoots 3 tiles up!
          b.h += 96;
          window.soundEngine.trap();
          this.die('Труба выросла и раздавила тебя!');
        }
      }
    }

    // Runaway Flagpole
    const fp = this.level.flagpole;
    if (!fp.reached && p.x > fp.x - 140 && !fp.runaway) {
      fp.runaway = true;
      fp.vx = 4.4;
      window.soundEngine.trap();
      this.addFloatingText(fp.x, fp.y + 40, 'АХАХА, НЕ ДОГОНИШЬ!');
    }
    if (fp.runaway && fp.x < this.level.width - 70) {
      fp.x += fp.vx;
    }

    // Reaching Flagpole
    if (!fp.reached && Math.abs(p.x - fp.x) < 32 && Math.abs(p.y - (fp.y + fp.h * 0.5)) < fp.h) {
      fp.reached = true;
      this.winGame();
    }
  }

  updateFloatingTexts() {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.016;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  isColliding(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  // --- RENDERING ENGINE (AUTHENTIC 1985 NES AESTHETICS) ---
  render() {
    const ctx = this.ctx;
    const cam = this.camera;

    // NES Sky Blue
    ctx.fillStyle = '#5c94fc';
    ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);

    ctx.save();
    ctx.translate(-Math.floor(cam.x), 0);

    // NES Clouds and Hills
    this.drawNesBackground(ctx);

    // Draw Solids with 1985 NES textures
    for (const b of this.level.solids) {
      if (b.x + b.w < cam.x - 64 || b.x > cam.x + this.virtualWidth + 64) continue;
      this.drawNesBlock(ctx, b);
    }

    // Draw Revealed Kaizo Blocks
    for (const ib of this.level.invisibleBlocks) {
      if (ib.revealed) {
        ctx.drawImage(window.SPRITES.brick, ib.x, ib.y, ib.w, ib.h);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('XD', ib.x + 8, ib.y + 20);
      }
    }

    // Draw Collapsing Bridge
    for (const ct of this.level.collapsingTiles) {
      ctx.drawImage(window.SPRITES.brick, ct.x, ct.y, ct.w, ct.h);
    }

    // Draw Spikes
    for (const s of this.level.spikes) {
      ctx.fillStyle = '#f8f8f8';
      ctx.beginPath();
      if (s.direction === 'down') {
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + s.w, s.y);
        ctx.lineTo(s.x + s.w / 2, s.y + s.h);
      } else {
        ctx.moveTo(s.x, s.y + s.h);
        ctx.lineTo(s.x + s.w, s.y + s.h);
        ctx.lineTo(s.x + s.w / 2, s.y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw Enemies with authentic Goomba / Bullet sprites
    for (const en of this.level.enemies) {
      if (!en.alive) continue;
      this.drawNesEnemy(ctx, en);
    }

    // Draw Flagpole & Castle
    this.drawNesCastle(ctx, this.level.castle);
    this.drawNesFlagpole(ctx, this.level.flagpole);

    // Draw Mario with NES Run/Jump Cycle
    this.drawNesPlayer(ctx, this.player);

    // Floating Trap Messages
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${ft.alpha})`;
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.font = 'bold 13px "Courier New", monospace';
      ctx.fillText(ft.text, ft.x - 36, ft.y);
      ctx.restore();
    }

    ctx.restore();

    // Game Over / Victory Overlay
    if (this.state === 'dead') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);
      ctx.fillStyle = '#ff2222';
      ctx.font = 'bold 26px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ТЫ ПОГИБ!', this.virtualWidth / 2, this.virtualHeight / 2 - 16);
      ctx.fillStyle = '#f8b800';
      ctx.font = 'bold 15px "Courier New", monospace';
      ctx.fillText(this.deathReason, this.virtualWidth / 2, this.virtualHeight / 2 + 16);
      ctx.textAlign = 'left';
    } else if (this.state === 'victory') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);
      ctx.fillStyle = '#00f800';
      ctx.font = 'bold 24px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ПОБЕДА! КУРС ПРОЙДЕН!', this.virtualWidth / 2, this.virtualHeight / 2);
      ctx.textAlign = 'left';
    }

    if (this.bot) this.bot.render(ctx);
  }

  drawNesBlock(ctx, b) {
    const yOff = b.shakeY || 0;
    if (b.type === 'ground') {
      // Repeat 32x32 ground blocks
      const cols = Math.floor(b.w / 32);
      const rows = Math.floor(b.h / 32);
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          ctx.drawImage(window.SPRITES.ground, b.x + c * 32, b.y + r * 32, 32, 32);
        }
      }
    } else if (b.type === 'question') {
      ctx.drawImage(window.SPRITES.question, b.x, b.y + yOff, b.w, b.h);
    } else if (b.type === 'brick' || b.type === 'stair') {
      ctx.drawImage(window.SPRITES.brick, b.x, b.y + yOff, b.w, b.h);
    } else if (b.type === 'pipe') {
      // Authentic NES Green Pipe with lip
      ctx.fillStyle = '#00a800';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      // Pipe top rim
      ctx.fillStyle = '#00e800';
      ctx.fillRect(b.x + 4, b.y, 8, b.h);
      ctx.fillStyle = '#005000';
      ctx.fillRect(b.x + b.w - 10, b.y, 10, b.h);
      // Rim cap
      ctx.fillStyle = '#00a800';
      ctx.fillRect(b.x - 3, b.y, b.w + 6, 20);
      ctx.fillStyle = '#00e800';
      ctx.fillRect(b.x + 3, b.y, 8, 20);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x - 3, b.y, b.w + 6, 20);
      ctx.strokeRect(b.x, b.y + 20, b.w, b.h - 20);
    } else if (b.type === 'spring') {
      ctx.fillStyle = '#ff2222';
      ctx.fillRect(b.x + 4, b.y, b.w - 8, b.h);
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(b.x + 4, b.y, b.w - 8, b.h);
    }
    if (b.shakeY) b.shakeY *= 0.8;
  }

  drawNesEnemy(ctx, en) {
    if (en.type === 'troll_goomba' || en.type === 'ninja_goomba') {
      const frame = Math.floor(Date.now() / 150) % 2 === 0 ? window.SPRITES.goomba1 : window.SPRITES.goomba2;
      ctx.drawImage(frame, en.x, en.y, en.w, en.h);
    } else if (en.type === 'troll_shroom') {
      // Poison / Hyper Mushroom
      ctx.fillStyle = '#a000c0';
      ctx.beginPath();
      ctx.arc(en.x + en.w / 2, en.y + 12, 14, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(en.x + 6, en.y + 4, 5, 5);
      ctx.fillRect(en.x + en.w - 11, en.y + 4, 5, 5);
      ctx.fillStyle = '#fc9838';
      ctx.fillRect(en.x + 6, en.y + 12, 16, 12);
    } else if (en.type === 'bullet_bill') {
      // Bullet Bill
      ctx.fillStyle = '#000000';
      ctx.fillRect(en.x, en.y, en.w - 8, en.h);
      ctx.beginPath();
      ctx.arc(en.x + en.w - 8, en.y + en.h / 2, en.h / 2, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
      // White eye
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(en.x + en.w - 14, en.y + 6, 6, 6);
      ctx.fillStyle = '#000000';
      ctx.fillRect(en.x + en.w - 11, en.y + 7, 3, 3);
    }
  }

  drawNesPlayer(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);

    if (p.facing === 'left') {
      ctx.scale(-1, 1);
      ctx.translate(-p.w, 0);
    }

    let sprite = window.SPRITES.marioStand;

    if (this.state === 'dead') {
      sprite = window.SPRITES.marioDie;
    } else if (!p.grounded) {
      sprite = window.SPRITES.marioJump;
    } else if (Math.abs(p.vx) > 0.3) {
      const f = Math.floor(this.walkAnimTimer) % 2;
      sprite = f === 0 ? window.SPRITES.marioRun1 : window.SPRITES.marioRun2;
    }

    ctx.drawImage(sprite, -4, -2, 32, 32);
    ctx.restore();
  }

  drawNesFlagpole(ctx, fp) {
    // Pole
    ctx.fillStyle = '#686868';
    ctx.fillRect(fp.x + 13, fp.y, 6, fp.h);
    // Gold top sphere
    ctx.fillStyle = '#f8b800';
    ctx.beginPath();
    ctx.arc(fp.x + 16, fp.y, 8, 0, Math.PI * 2);
    ctx.fill();
    // Green Flag
    ctx.fillStyle = '#00a800';
    ctx.beginPath();
    ctx.moveTo(fp.x + 13, fp.y + 10);
    ctx.lineTo(fp.x - 22, fp.y + 24);
    ctx.lineTo(fp.x + 13, fp.y + 38);
    ctx.fill();

    // Comical runaway legs
    if (fp.runaway) {
      ctx.fillStyle = '#222222';
      const leg = Math.sin(Date.now() * 0.025) * 8;
      ctx.fillRect(fp.x + 4, fp.y + fp.h, 6, 14 + leg);
      ctx.fillRect(fp.x + 22, fp.y + fp.h, 6, 14 - leg);
    }
  }

  drawNesCastle(ctx, c) {
    // Classic 1985 Castle
    ctx.fillStyle = '#808080';
    ctx.fillRect(c.x, c.y, c.w, c.h);
    // Castle Battlements
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(c.x + i * 32, c.y - 16, 20, 16);
    }
    // Dark Entrance Doorway
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(c.x + c.w / 2, c.y + c.h - 32, 18, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(c.x + c.w / 2 - 18, c.y + c.h - 32, 36, 32);
  }

  drawNesBackground(ctx) {
    // NES Clouds (white rounded shapes)
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 18; i++) {
      const cx = i * 290 + 50;
      ctx.beginPath();
      ctx.arc(cx, 55, 18, 0, Math.PI * 2);
      ctx.arc(cx + 20, 45, 24, 0, Math.PI * 2);
      ctx.arc(cx + 42, 55, 18, 0, Math.PI * 2);
      ctx.fill();
    }
    // NES Green Bushes
    ctx.fillStyle = '#00a800';
    for (let i = 0; i < 15; i++) {
      const bx = i * 340 + 120;
      ctx.beginPath();
      ctx.arc(bx, 11 * 32 - 4, 16, 0, Math.PI * 2);
      ctx.arc(bx + 18, 11 * 32 - 10, 20, 0, Math.PI * 2);
      ctx.arc(bx + 36, 11 * 32 - 4, 16, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  loop(currentTime) {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
