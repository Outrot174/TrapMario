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

  doJump(duration = 0.3) {
    this.jumpTimer = duration;
    this.game.keys.jump = true;
  }

  update(dt) {
    if (!this.active) return;

    // If dead, auto-restart immediately
    if (this.game.state === 'dead') {
      this.game.restart();
      return;
    }

    if (this.game.state === 'victory') {
      this.actionMessage = 'УРОВЕНЬ УСПЕШНО ПРОЙДЕН!';
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

    // Always sprint forward by default
    this.game.keys.right = true;
    this.game.keys.run = true;
    this.actionMessage = 'Спринт вперед на полной скорости';

    // 1. Dodging Goomba 1 (around x = 10..15 * TS)
    if (px >= 9.5 * TS && px < 16 * TS) {
      this.actionMessage = 'Прыжок через первого Гумбу!';
      if (p.grounded && px < 13 * TS) {
        this.doJump(0.32);
      }
    }

    // 2. Kaizo Pit 1 (x = 21..27 * TS)
    // Reveal block 1 from below, then high leap over gap!
    if (px >= 20.5 * TS && px < 27 * TS) {
      const kaizo = this.game.level.invisibleBlocks[0];
      if (!kaizo.revealed) {
        this.actionMessage = 'Обнаружение скрытого Kaizo-блока...';
        if (p.grounded && px >= 21.8 * TS && px <= 23 * TS) {
          this.doJump(0.18);
        }
      } else {
        this.actionMessage = 'Прыжок через пропасть 1!';
        if (p.grounded && px >= 22.8 * TS) {
          this.doJump(0.35);
        }
      }
    }

    // 3. Pipe 2 Baiting (x = 35..41 * TS)
    if (px >= 35 * TS && px < 41 * TS) {
      const pipe = this.game.level.solids.find(s => s.type === 'pipe' && s.isTroll);
      if (pipe && !pipe.trollFired) {
        this.actionMessage = 'Байт выдвигающейся трубы-ловушки!';
        if (px >= 36 * TS) {
          this.game.keys.right = false;
          this.game.keys.left = true; // Step back to trigger and avoid
          if (p.grounded) this.doJump(0.2);
        }
      } else {
        this.actionMessage = 'Труба обезврежена, перепрыгиваю!';
        if (p.grounded && px >= 36.2 * TS) {
          this.doJump(0.35);
        }
      }
    }

    // 4. Collapsing Bridge (x = 45..50 * TS)
    if (px >= 45 * TS && px < 50 * TS) {
      this.actionMessage = 'ТУРБО-СПРИНТ по обрушающемуся мосту!';
      this.game.keys.right = true;
      this.game.keys.run = true;
      if (p.grounded && px >= 48 * TS) {
        this.doJump(0.35);
      }
    }

    // 5. Falling Ceiling Spike (x = 50..54 * TS)
    if (px >= 50 * TS && px < 54 * TS) {
      const spike = this.game.level.spikes[0];
      if (spike && !spike.active) {
        this.actionMessage = 'Байт падающего шипа с потолка!';
        if (px >= 50 * TS) {
          this.game.keys.right = false;
          this.game.keys.left = true;
        }
      } else {
        this.actionMessage = 'Шип упал, прыжок дальше!';
        if (p.grounded && px >= 50.8 * TS) {
          this.doJump(0.35);
        }
      }
    }

    // 6. Troll Spring (x = 60..64 * TS)
    if (px >= 60 * TS && px < 64 * TS) {
      this.actionMessage = 'Обход пружины-ловушки!';
      if (p.grounded && px >= 60.2 * TS) {
        this.doJump(0.35); // Jump cleanly over the spring
      }
    }

    // 7. Ninja Goomba (x = 70..76 * TS)
    if (px >= 71 * TS && px < 76 * TS) {
      this.actionMessage = 'Прыжок через турбо-Гумбу!';
      if (p.grounded && px >= 71.5 * TS) {
        this.doJump(0.35);
      }
    }

    // 8. Rear Bullet Bill (x = 90..96 * TS)
    if (px >= 90 * TS && px < 96 * TS) {
      this.actionMessage = 'Уклонение от ракеты сзади!';
      const bullet = this.game.level.enemies.find(e => e.type === 'bullet_bill');
      if (bullet && Math.abs(px - bullet.x) < 80 && p.grounded) {
        this.doJump(0.35);
      }
    }

    // 9. Kaizo Staircase (x = 114..124 * TS)
    if (px >= 114 * TS && px < 125 * TS) {
      this.actionMessage = 'Подъем по лестнице (прыжок через шаг 4)...';
      if (p.grounded && px >= 117.5 * TS && px < 119 * TS) {
        this.doJump(0.32);
      }
      if (p.grounded && px >= 120.5 * TS) {
        this.doJump(0.35);
      }
    }

    // 10. Flagpole Chase (x >= 128 * TS)
    if (px >= 127 * TS) {
      this.actionMessage = 'ФЛАГ УБЕГАЕТ! ПОЛНЫЙ ФОРСАЖ НА B!';
      this.game.keys.right = true;
      this.game.keys.run = true;
      if (p.grounded && px >= 129 * TS) {
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
