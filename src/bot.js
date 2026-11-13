// Super Trap Mario - TAS AI Speedrunner & Autopilot
// Flawlessly dodges every Kaizo troll trap and catches the runaway flagpole!

class GameBot {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.actionMessage = '';
  }

  toggle() {
    this.active = !this.active;
    if (this.active) {
      this.game.addFloatingText(this.game.player.x, this.game.player.y - 30, '🤖 AI АВТОПИЛОТ ВКЛЮЧЕН!');
      window.soundEngine.trap();
    } else {
      this.game.addFloatingText(this.game.player.x, this.game.player.y - 30, '👤 РУЧНОЕ УПРАВЛЕНИЕ');
      this.resetKeys();
    }
    return this.active;
  }

  resetKeys() {
    this.game.keys.left = false;
    this.game.keys.right = false;
    this.game.keys.jump = false;
    this.game.keys.run = false;
  }

  update(dt) {
    if (!this.active || this.game.state !== 'playing') return;

    const p = this.game.player;
    const TS = 32;
    const px = p.x;
    const py = p.y;

    // Reset controls each tick to execute precise inputs
    this.resetKeys();

    // Default: Run right at maximum speed
    this.game.keys.right = true;
    this.game.keys.run = true;
    this.actionMessage = 'Спринт вперед...';

    // SECTION 1: Dodging Goomba 1 (around x = 12..16 * TS)
    if (px >= 11 * TS && px < 16 * TS) {
      this.actionMessage = 'Байт прыгающего Гумбы...';
      if (px >= 12.5 * TS && p.grounded) {
        this.game.keys.jump = true; // High vault over Goomba
      }
    }

    // SECTION 2: Neutralizing Pit 1 & Kaizo Invisible Block (x = 21..27 * TS)
    // The Kaizo block is at x=23*TS, y=7.5*TS.
    // Pro strategy: small hop at x=21.8 to reveal Kaizo block safely, then full jump over pit!
    if (px >= 21 * TS && px < 26.5 * TS) {
      const kaizo1 = this.game.level.invisibleBlocks[0];
      if (!kaizo1.revealed) {
        this.actionMessage = 'Разведка Kaizo-блока...';
        // Hit Kaizo block from safe ground position
        if (px >= 22.2 * TS && px < 23.2 * TS) {
          if (p.grounded) this.game.keys.jump = true;
        }
      } else {
        // Block is revealed! Now jump from its edge or clear the gap cleanly!
        this.actionMessage = 'Перепрыгивание пропасти 1...';
        if (px >= 23.5 * TS && p.grounded) {
          this.game.keys.jump = true;
        }
      }
    }

    // SECTION 3: Baited Pipe 2 (Extending Trap at x = 38 * TS)
    // Approaching: stop at x=36.5*TS, wait for pipe to shoot up, then jump over!
    if (px >= 35 * TS && px < 40 * TS) {
      const pipe2 = this.game.level.solids.find(s => s.type === 'pipe' && s.isTroll);
      if (pipe2 && !pipe2.trollFired) {
        this.actionMessage = 'Провокация ловушки-трубы...';
        if (px >= 36 * TS) {
          this.game.keys.right = false;
          this.game.keys.left = true; // Step back
          // Bait it by hopping
          if (p.grounded && px < 36.8 * TS) this.game.keys.jump = true;
        }
      } else {
        this.actionMessage = 'Труба обезврежена, прыжок!';
        if (px >= 36.2 * TS && p.grounded) {
          this.game.keys.jump = true;
        }
      }
    }

    // SECTION 4: Collapsing Bridge (x = 46..49 * TS)
    // Full speed sprint without stopping!
    if (px >= 45 * TS && px < 50 * TS) {
      this.actionMessage = 'ТУРБО-СПРИНТ по обваливающемуся мосту!';
      this.game.keys.right = true;
      this.game.keys.run = true;
      if (px >= 48.5 * TS && p.grounded) {
        this.game.keys.jump = true; // Leap onto platform 50
      }
    }

    // SECTION 5: Platform 50 & Falling Spike (x = 50..53 * TS)
    if (px >= 50 * TS && px < 54 * TS) {
      const spike = this.game.level.spikes[0];
      if (spike && !spike.active) {
        this.actionMessage = 'Байт падающего шипа с потолка!';
        // Step forward then quickly back
        if (px >= 50.2 * TS && px < 51 * TS) {
          this.game.keys.right = false;
          this.game.keys.left = true;
        }
      } else {
        this.actionMessage = 'Шип упал, прыжок на твердую землю!';
        if (px >= 50.8 * TS && p.grounded) {
          this.game.keys.jump = true;
        }
      }
    }

    // SECTION 6: Troll Spring (x = 62 * TS)
    // Spring leads to ceiling spikes! Bot jumps OVER the spring!
    if (px >= 60 * TS && px < 64 * TS) {
      this.actionMessage = 'Перепрыгивание ложной пружины!';
      if (px >= 60.5 * TS && p.grounded) {
        this.game.keys.jump = true;
      }
    }

    // SECTION 7: Ninja Goomba (x = 72..76 * TS)
    if (px >= 71 * TS && px < 76 * TS) {
      this.actionMessage = 'Перелет через Ниндзя-Гумбу!';
      if (px >= 72 * TS && p.grounded) {
        this.game.keys.jump = true;
      }
    }

    // SECTION 8: Rear Missile (x = 90..96 * TS)
    if (px >= 90 * TS && px < 96 * TS) {
      this.actionMessage = 'Внимание: ракета в спину!';
      const missile = this.game.level.enemies.find(e => e.type === 'bullet_bill');
      if (missile && Math.abs(px - missile.x) < 70 && p.grounded) {
        this.game.keys.jump = true; // Jump over missile
      }
    }

    // SECTION 9: Kaizo Staircase (x = 115..124 * TS)
    if (px >= 114 * TS && px < 125 * TS) {
      this.actionMessage = 'Подъем по лестнице (обход шага 4)...';
      // Jump over step 4 (x=119)
      if (px >= 117.8 * TS && px < 118.8 * TS && p.grounded) {
        this.game.keys.jump = true;
      }
      // Jump over step 7 invisible block (x=122)
      if (px >= 120.8 * TS && p.grounded) {
        this.game.keys.jump = true;
      }
    }

    // SECTION 10: Runaway Flagpole Chase (x = 128..145 * TS)
    if (px >= 127 * TS) {
      this.actionMessage = 'ФЛАГ УБЕГАЕТ! ПОЛНЫЙ ФОРСАЖ!';
      this.game.keys.right = true;
      this.game.keys.run = true;
      // High jump to snatch the runaway flagpole in mid-air
      if (px >= 130 * TS && p.grounded) {
        this.game.keys.jump = true;
      }
    }
  }

  render(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.fillStyle = '#00ff66';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.fillText(`🤖 AI BOT: ${this.actionMessage}`, 16, 52);
    ctx.restore();
  }
}

window.GameBot = GameBot;
