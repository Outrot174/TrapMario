// Super Trap Mario - TAS AI Speedrunner & Autopilot
// Plays the game with superhuman reaction time and completes the level!

class GameBot {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.actionMessage = 'Готов к прохождению';
    this.jumpTimer = 0;
  }

  toggle() {
    this.active = !this.active;
    if (this.active) {
      this.game.addFloatingText(this.game.player.x, this.game.player.y - 30, '🤖 AI АВТОПИЛОТ: СТАРТ!');
      window.soundEngine.win();
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

  doJump(duration = 0.35, customVy = null) {
    this.jumpTimer = duration;
    this.game.keys.jump = true;
    if (customVy !== null && this.game.player.grounded) {
      this.game.player.vy = customVy;
    }
  }

  update(dt) {
    if (!this.active) return;

    // If dead, auto-restart immediately
    if (this.game.state === 'dead') {
      this.game.restart();
      return;
    }

    if (this.game.state === 'victory') {
      this.actionMessage = 'УРОВЕНЬ УСПЕШНО ПРОЙДЕН! 👑';
      this.game.keys.right = false;
      this.game.keys.run = false;
      this.game.keys.jump = false;
      return;
    }

    const p = this.game.player;
    const TS = 32;
    const px = p.x;

    // Maintain jump holding
    if (this.jumpTimer > 0) {
      this.jumpTimer -= dt;
      this.game.keys.jump = true;
    } else {
      this.game.keys.jump = false;
    }

    // Default: turbo sprint forward
    this.game.keys.left = false;
    this.game.keys.right = true;
    this.game.keys.run = true;
    this.actionMessage = 'Турбо-спринт вперед на полной скорости';

    // 1. Goomba 1 (x=16 * TS): Jump after blocks at x=12.5 * TS into clear sky
    if (px >= 12.0 * TS && px < 16.0 * TS) {
      this.actionMessage = 'Прыжок через первого Гумбу!';
      if (p.grounded && px >= 12.2 * TS && px < 13.8 * TS) {
        this.doJump(0.35);
      }
    }

    // 2. Kaizo Pit 1 (x=21..27 * TS): Low sprint hop under ceiling Kaizo block!
    else if (px >= 20.5 * TS && px < 27.0 * TS) {
      this.actionMessage = 'Низкий Kaizo-прыжок под потолочным блоком!';
      if (p.grounded && px >= 21.0 * TS && px < 22.0 * TS) {
        this.doJump(0.18, -8.2);
      }
    }

    // 3. Pipe 1 (x=31 * TS): Jump over 2-tile pipe
    else if (px >= 28.5 * TS && px < 33.0 * TS) {
      this.actionMessage = 'Перепрыгиваем трубу 1!';
      if (p.grounded && px < 30.5 * TS) {
        this.doJump(0.35);
      }
    }

    // 4. Pipe 2 Baiting (x=38 * TS): Bait extender pipe, step back, then leap
    else if (px >= 34.5 * TS && px < 41.0 * TS) {
      const pipe = this.game.level.solids.find(s => s.type === 'pipe' && s.isTroll);
      if (pipe && pipe.extended) {
        this.actionMessage = 'Байт трубы-ловушки: шаг назад!';
        this.game.keys.right = false;
        this.game.keys.left = true;
      } else {
        this.actionMessage = 'Труба готова, перепрыгиваю!';
        if (p.grounded && px >= 35.8 * TS && px < 37.5 * TS) {
          this.doJump(0.35);
        }
      }
    }

    // 5. Pipe 3 (x=45 * TS): Full sprint jump over 3-tile pipe
    else if (px >= 42.0 * TS && px < 46.5 * TS) {
      this.actionMessage = 'Прыжок через трубу 3!';
      if (p.grounded && px < 44.5 * TS) {
        this.doJump(0.35);
      }
    }

    // 6. Collapsing bridge & Platform 50 (x=46..54 * TS): Turbo leap to evade ceiling spike!
    else if (px >= 46.2 * TS && px < 54.0 * TS) {
      this.actionMessage = 'Турбо-прыжок на платформу 50 и далее!';
      if (p.grounded && px < 48.0 * TS) {
        this.doJump(0.35);
      } else if (p.grounded && px >= 49.5 * TS && px <= 51.5 * TS) {
        this.doJump(0.35);
      }
    }

    // 7. Troll Spring (x=62 * TS): Leap cleanly over spring into ceiling spikes
    else if (px >= 58.5 * TS && px < 64.0 * TS) {
      this.actionMessage = 'Прыжок через пружину-ловушку!';
      if (p.grounded && px < 61.0 * TS) {
        this.doJump(0.35);
      }
    }

    // 8. Ninja Goomba (x=74 * TS): Jump over dashing high-speed Goomba
    else if (px >= 69.0 * TS && px < 76.0 * TS) {
      this.actionMessage = 'Прыжок над турбо-Гумбой!';
      if (p.grounded && px < 72.0 * TS) {
        this.doJump(0.35);
      }
    }

    // 9. Pit 3 (x=82..88 * TS): 6-tile sprint leap
    else if (px >= 80.0 * TS && px < 88.0 * TS) {
      this.actionMessage = 'Прыжок через пропасть 3!';
      if (p.grounded && px < 82.0 * TS) {
        this.doJump(0.35);
      }
    }

    // 10. Rear Bullet Bill (trigger at x=92 * TS): Jump over missile from behind
    else if (px >= 92.0 * TS && px < 96.0 * TS) {
      this.actionMessage = 'Уклонение от ракеты сзади!';
      if (p.grounded && px < 94.0 * TS) {
        this.doJump(0.35);
      }
    }

    // 11. Kaizo Staircase (x=115..125 * TS): Hop up, clear step 4 & step 7
    else if (px >= 114.0 * TS && px < 125.0 * TS) {
      this.actionMessage = 'Подъем по коварной лестнице!';
      if (p.grounded) {
        if (px >= 117.5 * TS && px < 119.5 * TS) {
          this.doJump(0.35); // Leap over collapsing step 4
        } else if (px >= 120.8 * TS && px < 122.5 * TS) {
          this.doJump(0.35); // Leap over step 7
        } else {
          this.doJump(0.20); // Normal hop up step
        }
      }
    }

    // 12. Runaway Flagpole (x >= 126 * TS): Maximum sprint chase and leap!
    else if (px >= 126.0 * TS) {
      this.actionMessage = 'ПОЛНЫЙ ФОРСАЖ: ЛОВИМ ФЛАГ!';
      if (p.grounded && px >= 132.5 * TS) {
        this.doJump(0.35);
      }
    }

    // Proactive emergency jump: if any enemy is within 48px in front
    for (const en of this.game.level.enemies) {
      if (en.alive && en.x > px && en.x - px < 48 && p.grounded) {
        this.doJump(0.35);
      }
    }
  }

  render(ctx) {
    if (!this.active) return;
    ctx.save();
    // Neon badge
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 40, 480, 26);
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(10, 40, 480, 26);

    ctx.fillStyle = '#00ff66';
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillText(`🤖 AI AUTOPILOT: ${this.actionMessage}`, 18, 58);
    ctx.restore();
  }
}

window.GameBot = GameBot;
