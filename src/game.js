// TrapMario - Core Game Engine with Touch Controls, Troll Physics & Retro Visuals

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // Fixed virtual resolution
    this.virtualWidth = 640;
    this.virtualHeight = 360;
    this.canvas.width = this.virtualWidth;
    this.canvas.height = this.virtualHeight;

    // Controls state
    this.keys = { left: false, right: false, jump: false, run: false };

    // Death counter and state
    this.deaths = parseInt(localStorage.getItem('trap_mario_deaths') || '0', 10);
    this.state = 'playing'; // 'playing' | 'dead' | 'victory'
    this.deathTimer = 0;
    this.deathReason = '';
    this.floatingTexts = [];

    // Camera
    this.camera = { x: 0, y: 0 };

    this.initLevel();
    this.bindControls();
    this.bindTouchControls();

    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  initLevel() {
    this.level = new window.LevelData();
    this.player = {
      x: 64,
      y: 10 * 32,
      w: 22,
      h: 28,
      vx: 0,
      vy: 0,
      speed: 3.2,
      maxVx: 4.5,
      jumpForce: -9.8,
      grounded: false,
      facing: 'right',
      dead: false,
      deathVy: 0,
      squashed: false
    };
    this.state = 'playing';
    this.deathTimer = 0;
    this.camera.x = 0;
  }

  restart() {
    this.deaths++;
    localStorage.setItem('trap_mario_deaths', this.deaths.toString());
    const deathCountEl = document.getElementById('deathCount');
    if (deathCountEl) deathCountEl.innerText = this.deaths;
    this.initLevel();
    window.soundEngine.startBgm();
  }

  die(reason) {
    if (this.player.dead) return;
    this.player.dead = true;
    this.state = 'dead';
    this.deathReason = reason;
    this.player.deathVy = -11;
    window.soundEngine.die();
    window.soundEngine.stopBgm();

    this.addFloatingText(this.player.x, this.player.y - 20, reason);

    // Auto restart after 1.8 seconds
    setTimeout(() => {
      this.restart();
    }, 1800);
  }

  winGame() {
    if (this.state === 'victory') return;
    this.state = 'victory';
    window.soundEngine.win();
    this.addFloatingText(this.player.x, this.player.y - 40, 'НЕВЕРОЯТНО! ТЫ ПРОШЁЛ ЭТОТ АД!');
  }

  addFloatingText(x, y, text) {
    this.floatingTexts.push({ x, y, text, alpha: 1.0, vy: -1.2 });
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
      const start = (e) => {
        e.preventDefault();
        this.keys[keyName] = true;
        el.classList.add('active');
        window.soundEngine.init();
        window.soundEngine.startBgm();
      };
      const end = (e) => {
        e.preventDefault();
        this.keys[keyName] = false;
        el.classList.remove('active');
      };
      el.addEventListener('touchstart', start, { passive: false });
      el.addEventListener('touchend', end, { passive: false });
      el.addEventListener('mousedown', start);
      el.addEventListener('mouseup', end);
    };

    bindBtn('btnLeft', 'left');
    bindBtn('btnRight', 'right');
    bindBtn('btnJump', 'jump');
    bindBtn('btnRun', 'run');

    const btnRestart = document.getElementById('btnRestart');
    if (btnRestart) {
      btnRestart.addEventListener('click', () => this.restart());
      btnRestart.addEventListener('touchstart', (e) => { e.preventDefault(); this.restart(); }, { passive: false });
    }
  }

  update(dt) {
    if (this.state === 'dead') {
      this.player.deathVy += 0.45;
      this.player.y += this.player.deathVy;
      this.updateFloatingTexts();
      return;
    }

    if (this.state === 'victory') {
      this.player.vx = 2.0;
      this.player.x += this.player.vx;
      this.updateFloatingTexts();
      return;
    }

    const p = this.player;

    // Horizontal Movement
    const accel = this.keys.run ? 0.6 : 0.4;
    const maxV = this.keys.run ? p.maxVx * 1.3 : p.maxVx;

    if (this.keys.left) {
      p.vx = Math.max(p.vx - accel, -maxV);
      p.facing = 'left';
    } else if (this.keys.right) {
      p.vx = Math.min(p.vx + accel, maxV);
      p.facing = 'right';
    } else {
      p.vx *= 0.78;
      if (Math.abs(p.vx) < 0.1) p.vx = 0;
    }

    // Gravity
    p.vy += 0.52;
    if (p.vy > 12) p.vy = 12;

    // Jump
    if (this.keys.jump && p.grounded) {
      p.vy = p.jumpForce;
      p.grounded = false;
      window.soundEngine.jump();
    }

    // Horizontal Collision
    p.x += p.vx;
    this.checkHorizontalCollisions();

    // Vertical Collision
    p.y += p.vy;
    p.grounded = false;
    this.checkVerticalCollisions();

    // Fall into abyss
    if (p.y > this.level.height + 64) {
      this.die('Бездна поглотила тебя!');
    }

    // Check Traps & Triggers
    this.updateTraps(dt);

    // Update Floating Texts
    this.updateFloatingTexts();

    // Camera follow player
    const targetCamX = p.x - this.virtualWidth * 0.35;
    this.camera.x += (targetCamX - this.camera.x) * 0.1;
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

    // Solid blocks
    for (const b of this.level.solids) {
      if (this.isColliding(p, b)) {
        if (p.vy > 0) { // Landing on top
          p.y = b.y - p.h;
          p.vy = 0;
          p.grounded = true;

          // Spring logic
          if (b.type === 'spring') {
            p.vy = -14.5;
            p.grounded = false;
            window.soundEngine.trap();
            this.addFloatingText(p.x, p.y - 10, 'ПРЫЫЫЖОК В ЛОВУШКУ!');
          }
        } else if (p.vy < 0) { // Hitting from below
          p.y = b.y + b.h;
          p.vy = 0;
          this.onBlockHit(b);
        }
      }
    }

    // Invisible Blocks (the iconic Mario troll mechanic!)
    for (const ib of this.level.invisibleBlocks) {
      if (this.isColliding(p, ib)) {
        if (p.vy < 0) { // Head bump into invisible block!
          ib.revealed = true;
          p.y = ib.y + ib.h;
          p.vy = 2.0; // Knock down!
          window.soundEngine.bonk();
          this.addFloatingText(ib.x, ib.y - 12, ib.message || 'БАМЦ!');
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
    window.soundEngine.bonk();
    b.shakeY = -6;

    if (b.extra && b.extra.trap === 'poison_shroom') {
      window.soundEngine.trap();
      this.level.enemies.push({
        x: b.x,
        y: b.y - 32,
        w: 26,
        h: 26,
        vx: 4.8, // Hyper-fast poison mushroom!
        vy: -3,
        type: 'poison_shroom',
        alive: true
      });
      this.addFloatingText(b.x, b.y - 20, 'БЕГИ, ГРИБ УБИЙЦА!');
    } else if (b.extra && b.extra.trap === 'fall_brick') {
      // Brick falls down onto Mario
      window.soundEngine.trap();
      b.falling = true;
      this.die('Кирпич упал на голову!');
    } else if (b.extra && b.extra.trap === 'coin_bomb') {
      window.soundEngine.coin();
      setTimeout(() => {
        window.soundEngine.trap();
        this.die('Монета оказалась гранатой!');
      }, 200);
    }
  }

  updateTraps(dt) {
    const p = this.player;

    // Collapsing floor tiles
    for (const ct of this.level.collapsingTiles) {
      if (ct.triggered) {
        ct.timer -= 0.016;
        if (ct.timer <= 0) {
          ct.falling = true;
          ct.vy += 0.6;
          ct.y += ct.vy;
        }
      }
    }

    // Spikes
    for (const s of this.level.spikes) {
      if (s.triggerX && Math.abs(p.x - s.triggerX) < 32 && !s.active) {
        s.active = true;
        window.soundEngine.trap();
      }
      if (s.active && s.direction === 'down') {
        s.y += 6.5; // Falling spike
      }
      if (this.isColliding(p, s)) {
        this.die('Насажен на шипы!');
      }
    }

    // Dynamic triggers
    for (const tr of this.level.triggers) {
      if (!tr.triggered && p.x >= tr.x) {
        tr.triggered = true;
        tr.action(this);
      }
    }

    // Enemies & Missiles
    for (const en of this.level.enemies) {
      if (!en.alive) continue;
      en.x += en.vx;

      // Troll Goomba reaction when Mario jumps near
      if (en.type === 'troll_goomba' && !en.jumpedOn) {
        if (Math.abs(p.x - en.x) < 48 && p.vy > 0 && p.y < en.y) {
          // Goomba jumps up to intercept Mario!
          en.vy = -7.5;
          en.jumpedOn = true;
          window.soundEngine.trap();
          this.addFloatingText(en.x, en.y - 16, 'КУДА ТЫ, Я ЛЕТАТЬ УМЕЮ!');
        }
      }
      en.y += (en.vy || 0);

      // Ninja Goomba dash
      if (en.type === 'ninja_goomba' && !en.triggered && Math.abs(p.x - en.x) < 140) {
        en.triggered = true;
        en.vx = -6.8; // Dash!
        window.soundEngine.trap();
        this.addFloatingText(en.x, en.y - 16, 'ВЖУУУУХ!');
      }

      // Collision with player
      if (this.isColliding(p, en)) {
        if (en.type === 'poison_shroom') {
          this.die('Ядовитый супер-гриб догнал тебя!');
        } else if (en.type === 'rear_missile') {
          this.die('Ракета в спину! Сюрприз!');
        } else {
          this.die('Губка не простил твоей дерзости!');
        }
      }
    }

    // Pipe 2 Piranha Trap
    for (const b of this.level.solids) {
      if (b.type === 'pipe' && b.isTroll && !b.trollFired) {
        if (Math.abs(p.x - (b.x + 32)) < 36 && p.y < b.y) {
          b.trollFired = true;
          window.soundEngine.trap();
          this.die('Труба-ловушка укусила тебя!');
        }
      }
    }

    // Flagpole Troll: When approaching, flagpole runs away!
    const fp = this.level.flagpole;
    if (!fp.reached && p.x > fp.x - 120 && !fp.runaway) {
      fp.runaway = true;
      fp.vx = 4.2;
      window.soundEngine.trap();
      this.addFloatingText(fp.x, fp.y + 40, 'ХА-ХА, ДОГОНИ МЕНЯ!');
    }
    if (fp.runaway && fp.x < this.level.width - 64) {
      fp.x += fp.vx;
    }

    // Win condition: Player must catch the flagpole!
    if (!fp.reached && Math.abs(p.x - fp.x) < 28 && Math.abs(p.y - (fp.y + fp.h * 0.5)) < fp.h) {
      fp.reached = true;
      this.winGame();
    }
  }

  updateFloatingTexts() {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.015;
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

  // Visual Rendering
  render() {
    const ctx = this.ctx;
    const cam = this.camera;

    // Sky Background
    ctx.fillStyle = '#5c94fc';
    ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);

    ctx.save();
    ctx.translate(-Math.floor(cam.x), 0);

    // Decorative Clouds & Hills
    this.drawBackgroundElements(ctx);

    // Draw Solids
    for (const b of this.level.solids) {
      if (b.x + b.w < cam.x - 50 || b.x > cam.x + this.virtualWidth + 50) continue;
      this.drawBlock(ctx, b);
    }

    // Draw Invisible Blocks (revealed)
    for (const ib of this.level.invisibleBlocks) {
      if (ib.revealed) {
        ctx.fillStyle = '#b87333';
        ctx.fillRect(ib.x, ib.y, ib.w, ib.h);
        ctx.strokeStyle = '#5c2c00';
        ctx.lineWidth = 2;
        ctx.strokeRect(ib.x, ib.y, ib.w, ib.h);
        // Troll icon inside
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.fillText('XD', ib.x + 8, ib.y + 20);
      }
    }

    // Draw Collapsing Tiles
    for (const ct of this.level.collapsingTiles) {
      ctx.fillStyle = ct.triggered ? '#d2691e' : '#b87333';
      ctx.fillRect(ct.x, ct.y, ct.w, ct.h);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(ct.x, ct.y, ct.w, ct.h);
    }

    // Draw Spikes
    for (const s of this.level.spikes) {
      ctx.fillStyle = '#dcdcdc';
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
      ctx.strokeStyle = '#333';
      ctx.stroke();
    }

    // Draw Enemies & Missiles
    for (const en of this.level.enemies) {
      if (!en.alive) continue;
      this.drawEnemy(ctx, en);
    }

    // Draw Flagpole
    this.drawFlagpole(ctx, this.level.flagpole);

    // Draw Mario
    this.drawPlayer(ctx, this.player);

    // Draw Floating Messages
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${ft.alpha})`;
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.fillText(ft.text, ft.x - 30, ft.y);
      ctx.restore();
    }

    ctx.restore();

    // Death overlay
    if (this.state === 'dead') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);
      ctx.fillStyle = '#ff3333';
      ctx.font = 'bold 22px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ТЫ ПОГИБ!', this.virtualWidth / 2, this.virtualHeight / 2 - 15);
      ctx.fillStyle = '#ffff66';
      ctx.font = '14px monospace';
      ctx.fillText(this.deathReason, this.virtualWidth / 2, this.virtualHeight / 2 + 15);
      ctx.textAlign = 'left';
    } else if (this.state === 'victory') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);
      ctx.fillStyle = '#00ff66';
      ctx.font = 'bold 24px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ПОБЕДА! ЭТО БЫЛО НЕВОЗМОЖНО!', this.virtualWidth / 2, this.virtualHeight / 2);
      ctx.textAlign = 'left';
    }
  }

  drawBlock(ctx, b) {
    if (b.type === 'ground') {
      ctx.fillStyle = '#c84c0c';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = '#00aa00';
      ctx.fillRect(b.x, b.y, b.w, 4);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    } else if (b.type === 'question') {
      ctx.fillStyle = '#fc9838';
      ctx.fillRect(b.x, b.y + (b.shakeY || 0), b.w, b.h);
      ctx.strokeStyle = '#000';
      ctx.strokeRect(b.x, b.y + (b.shakeY || 0), b.w, b.h);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('?', b.x + 10, b.y + 22 + (b.shakeY || 0));
    } else if (b.type === 'brick' || b.type === 'stair') {
      ctx.fillStyle = '#b84418';
      ctx.fillRect(b.x, b.y + (b.shakeY || 0), b.w, b.h);
      ctx.strokeStyle = '#000';
      ctx.strokeRect(b.x, b.y + (b.shakeY || 0), b.w, b.h);
    } else if (b.type === 'pipe') {
      ctx.fillStyle = '#00a800';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = '#00e000';
      ctx.fillRect(b.x - 2, b.y, b.w + 4, 16);
      ctx.strokeStyle = '#004400';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x - 2, b.y, b.w + 4, 16);
      ctx.strokeRect(b.x, b.y + 16, b.w, b.h - 16);
    } else if (b.type === 'spring') {
      ctx.fillStyle = '#e60000';
      ctx.fillRect(b.x + 4, b.y, b.w - 8, b.h);
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(b.x + 4, b.y, b.w - 8, b.h);
    }
    if (b.shakeY) b.shakeY *= 0.8;
  }

  drawEnemy(ctx, en) {
    if (en.type === 'troll_goomba' || en.type === 'ninja_goomba') {
      ctx.fillStyle = en.type === 'ninja_goomba' ? '#222222' : '#a84000';
      ctx.beginPath();
      ctx.arc(en.x + en.w / 2, en.y + en.h / 2, en.w / 2, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(en.x + 6, en.y + 8, 4, 6);
      ctx.fillRect(en.x + 16, en.y + 8, 4, 6);
      ctx.fillStyle = '#000';
      ctx.fillRect(en.x + 8, en.y + 10, 2, 4);
      ctx.fillRect(en.x + 18, en.y + 10, 2, 4);
      // Feet
      ctx.fillStyle = '#000';
      ctx.fillRect(en.x + 2, en.y + en.h - 4, 8, 4);
      ctx.fillRect(en.x + en.w - 10, en.y + en.h - 4, 8, 4);
    } else if (en.type === 'poison_shroom') {
      ctx.fillStyle = '#800080';
      ctx.beginPath();
      ctx.arc(en.x + en.w / 2, en.y + 10, 12, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(en.x + 4, en.y + 4, 4, 4);
      ctx.fillRect(en.x + 14, en.y + 4, 4, 4);
    } else if (en.type === 'rear_missile') {
      ctx.fillStyle = '#111';
      ctx.fillRect(en.x, en.y, en.w, en.h);
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.moveTo(en.x + en.w, en.y + en.h / 2);
      ctx.lineTo(en.x + en.w + 10, en.y);
      ctx.lineTo(en.x + en.w + 10, en.y + en.h);
      ctx.fill();
    }
  }

  drawPlayer(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);

    if (p.facing === 'left') {
      ctx.scale(-1, 1);
      ctx.translate(-p.w, 0);
    }

    // Red Cap
    ctx.fillStyle = '#e52521';
    ctx.fillRect(4, 0, 16, 7);
    ctx.fillRect(8, 7, 14, 3);

    // Face
    ctx.fillStyle = '#fcb89c';
    ctx.fillRect(6, 7, 10, 8);
    // Mustache & Eye
    ctx.fillStyle = '#000';
    ctx.fillRect(12, 9, 2, 3);
    ctx.fillRect(10, 12, 8, 3);

    // Overalls (Blue) & Shirt (Red)
    ctx.fillStyle = '#e52521';
    ctx.fillRect(4, 15, 14, 6);
    ctx.fillStyle = '#0026ff';
    ctx.fillRect(6, 17, 10, 8);

    // Shoes
    ctx.fillStyle = '#6b4000';
    ctx.fillRect(2, 24, 7, 4);
    ctx.fillRect(13, 24, 7, 4);

    ctx.restore();
  }

  drawFlagpole(ctx, fp) {
    // Pole
    ctx.fillStyle = '#555';
    ctx.fillRect(fp.x + 12, fp.y, 6, fp.h);
    // Gold top sphere
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(fp.x + 15, fp.y, 8, 0, Math.PI * 2);
    ctx.fill();
    // Green Flag
    ctx.fillStyle = '#00cc00';
    ctx.beginPath();
    ctx.moveTo(fp.x + 12, fp.y + 12);
    ctx.lineTo(fp.x - 18, fp.y + 24);
    ctx.lineTo(fp.x + 12, fp.y + 36);
    ctx.fill();

    // If flagpole is running away, draw comical running legs!
    if (fp.runaway) {
      ctx.fillStyle = '#333';
      const legOffset = Math.sin(Date.now() * 0.02) * 6;
      ctx.fillRect(fp.x + 4, fp.y + fp.h, 6, 12 + legOffset);
      ctx.fillRect(fp.x + 18, fp.y + fp.h, 6, 12 - legOffset);
    }
  }

  drawBackgroundElements(ctx) {
    // Simple retro clouds & bushes
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 20; i++) {
      const cx = i * 280 + 40;
      ctx.beginPath();
      ctx.arc(cx, 60, 20, 0, Math.PI * 2);
      ctx.arc(cx + 20, 50, 26, 0, Math.PI * 2);
      ctx.arc(cx + 40, 60, 20, 0, Math.PI * 2);
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
