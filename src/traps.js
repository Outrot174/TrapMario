// Super Trap Mario - 1985 Kaizo / Syobon Action Level Architecture
// Fully deterministic: Every trap can be learned and beaten with memory and skill!

const TILE_SIZE = 32;

class LevelData {
  constructor() {
    this.width = 155 * TILE_SIZE;
    this.height = 12 * TILE_SIZE;

    this.solids = [];
    this.invisibleBlocks = [];
    this.collapsingTiles = [];
    this.spikes = [];
    this.enemies = [];
    this.triggers = [];

    // The iconic troll runaway flagpole
    this.flagpole = {
      x: 132 * TILE_SIZE,
      y: 2 * TILE_SIZE,
      h: 9 * TILE_SIZE,
      reached: false,
      runaway: false,
      vx: 0
    };

    this.castle = {
      x: 142 * TILE_SIZE,
      y: 6 * TILE_SIZE,
      w: 5 * TILE_SIZE,
      h: 5 * TILE_SIZE
    };

    this.initWorld1_1();
  }

  initWorld1_1() {
    const TS = TILE_SIZE;

    // --- GROUND SECTIONS & PITS ---
    // Section 1: Start to Pit 1
    this.addGround(0, 22, 11);

    // PIT 1: 22 to 26 (Kaizo Jump Zone)
    // Section 2: Pit 1 to Pit 2
    this.addGround(26, 48, 11);

    // PIT 2: 48 to 54
    // Section 3: Pit 2 to Pit 3
    this.addGround(54, 82, 11);

    // PIT 3: 82 to 88
    // Section 4: Pit 3 to Castle
    this.addGround(88, 155, 11);

    // --- QUESTION BLOCKS & BRICKS (WORLD 1-1 LOOKALIKE) ---
    // Classic 4 blocks at x=8..11, y=7
    this.addBlock(8, 7, 'question', { trap: 'troll_shroom' });
    this.addBlock(9, 7, 'brick', { trap: 'fall_brick' });
    this.addBlock(10, 7, 'question', { trap: 'bomb_coin' });
    this.addBlock(11, 7, 'brick', { trap: 'none' });

    // High question block at x=10, y=3
    this.addBlock(10, 3, 'question', { trap: 'none' });

    // --- TRAP 1: THE ICONIC KAIZO BLOCK (Mid-air Ceiling Trap) ---
    // Placed above Gap 1 at (23.5, 6.5): high jumpers hit ceiling and fall, low sprint hop clears it!
    this.invisibleBlocks.push({
      x: 23.5 * TS,
      y: 6.5 * TS,
      w: TS,
      h: TS,
      revealed: false,
      message: 'ЛОЛ! ПЕРВЫЙ KAIZO БЛОК!'
    });

    // Secondary Kaizo block above for full-speed jumpers at (25, 5.5)
    this.invisibleBlocks.push({
      x: 25.0 * TS,
      y: 5.5 * TS,
      w: TS,
      h: TS,
      revealed: false,
      message: 'И ЗДЕСЬ БЛОК! :)'
    });

    // --- PIPES ---
    // Pipe 1 at x=31: Normal safe pipe (2 tiles tall)
    this.addPipe(31, 9, 2, false);

    // --- TRAP 2: PIPE 2 EXTENDER (x=38) ---
    // Approaching pipe 2: shoots upward 2 tiles, squashing jumpers, then retracts after 1.2s!
    this.addPipe(38, 9, 2, true);

    // Pipe 3 at x=45: Safe pipe (3 tiles tall, jumpable with full sprint)
    this.addPipe(45, 8, 3, false);

    // --- TRAP 3: COLLAPSING BRIDGE (x=46..48) ---
    for (let tx = 46; tx <= 48; tx++) {
      this.collapsingTiles.push({
        x: tx * TS,
        y: 11 * TS,
        w: TS,
        h: TS,
        triggered: false,
        timer: 0.1,
        vy: 0,
        falling: false
      });
    }

    // High platform across Pit 2: x=50, y=6
    this.addBlock(50, 6, 'brick', { trap: 'none' });
    this.addBlock(51, 6, 'brick', { trap: 'none' });

    // --- TRAP 4: FALLING CEILING SPIKE (over platform 50) ---
    this.spikes.push({
      x: 50.5 * TS,
      y: 0,
      w: 24,
      h: 24,
      active: false,
      direction: 'down',
      triggerX: 50 * TS
    });

    // --- TRAP 5: TROLL SPRING (x=62) ---
    // Spring looks like a nice shortcut over the next pit, but launches Mario into ceiling spikes!
    this.addSpring(62, 10);
    this.spikes.push({
      x: 61 * TS,
      y: 1 * TS,
      w: 3 * TS,
      h: 20,
      active: true,
      direction: 'down'
    });

    // --- TRAP 6: TROLL ENEMIES ---
    // Goomba 1 at x=16: Placed right after question blocks for a clean runway!
    this.enemies.push({
      x: 16 * TS,
      y: 10 * TS,
      w: TS,
      h: TS,
      vx: -1.2,
      vy: 0,
      type: 'troll_goomba',
      jumpedOn: false,
      alive: true
    });

    // Goomba 2 at x=70: Ninja Dasher (charges at 5x speed)
    this.enemies.push({
      x: 74 * TS,
      y: 10 * TS,
      w: TS,
      h: TS,
      vx: -1.0,
      vy: 0,
      type: 'ninja_goomba',
      triggered: false,
      alive: true
    });

    // --- TRAP 7: REAR BULLET BILL MISSILE (trigger at x=92) ---
    this.triggers.push({
      x: 92 * TS,
      triggered: false,
      action: (game) => {
        game.level.enemies.push({
          x: game.camera.x - 32,
          y: game.player.y - 8,
          w: TS * 1.3,
          h: TS * 0.9,
          vx: 7.2, // Fast surprise missile!
          vy: 0,
          type: 'bullet_bill',
          alive: true
        });
        window.soundEngine.trap();
      }
    });

    // --- TRAP 8: KAIZO STAIRCASE (x=115..124) ---
    // Step 4 collapses, and Step 7 has an invisible block right above!
    for (let step = 0; step < 8; step++) {
      for (let sy = 0; sy <= step; sy++) {
        if (step === 4 && sy === step) {
          // Phantom collapsing step!
          this.collapsingTiles.push({
            x: (115 + step) * TS,
            y: (10 - sy) * TS,
            w: TS,
            h: TS,
            triggered: false,
            timer: 0.08,
            vy: 0,
            falling: false
          });
        } else {
          this.addBlock(115 + step, 10 - sy, 'stair');
        }
      }
    }

    // Invisible block high above the top of the stairs (122, 1.0)
    this.invisibleBlocks.push({
      x: 122 * TS,
      y: 1.0 * TS,
      w: TS,
      h: TS,
      revealed: false,
      message: 'УПС! ВЕРШИНА ЗАКРЫТА!'
    });

    // --- TRAP 9: RUNAWAY FLAGPOLE (x=132) ---
    this.flagpole.x = 132 * TS;
    this.flagpole.y = 2 * TS;
  }

  addGround(startTile, endTile, rowTile) {
    const TS = TILE_SIZE;
    this.solids.push({
      x: startTile * TS,
      y: rowTile * TS,
      w: (endTile - startTile) * TS,
      h: 3 * TS,
      type: 'ground'
    });
  }

  addBlock(tileX, tileY, type, extra = {}) {
    const TS = TILE_SIZE;
    this.solids.push({
      x: tileX * TS,
      y: tileY * TS,
      w: TS,
      h: TS,
      type: type,
      extra: extra,
      hit: false,
      shakeY: 0
    });
  }

  addPipe(tileX, tileY, heightTiles, isTroll) {
    const TS = TILE_SIZE;
    this.solids.push({
      x: tileX * TS,
      y: tileY * TS,
      w: 2 * TS,
      h: heightTiles * TS,
      type: 'pipe',
      isTroll: isTroll,
      origY: tileY * TS,
      origH: heightTiles * TS,
      trollFired: false
    });
  }

  addSpring(tileX, tileY) {
    const TS = TILE_SIZE;
    this.solids.push({
      x: tileX * TS,
      y: tileY * TS + 16,
      w: TS,
      h: 16,
      type: 'spring'
    });
  }
}

window.LevelData = LevelData;
