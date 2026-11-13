// TrapMario - Stage Traps, Entities & Level Definitions
// Every trap is completely deterministic: player can learn and conquer with skill!

const TILE_SIZE = 32;

class LevelData {
  constructor() {
    this.width = 140 * TILE_SIZE;
    this.height = 14 * TILE_SIZE;

    // Static Solid Ground & Platforms
    this.solids = [];
    
    // Invisible Blocks {x, y, w, h, revealed: false, content: 'bonk' | 'crush' | 'poison'}
    this.invisibleBlocks = [];

    // Falling / Collapsing Tiles {x, y, w, h, triggered: false, vy: 0}
    this.collapsingTiles = [];

    // Spikes {x, y, w, h, direction: 'up' | 'down'}
    this.spikes = [];

    // Enemies {x, y, vx, vy, type: 'troll_goomba' | 'missile' | 'fake_pipe', state, ...}
    this.enemies = [];

    // Trigger Zones: invisible areas that cause dynamic trap events
    this.triggers = [];

    // Flagpole {x, y, running: false, vx: 0}
    this.flagpole = { x: 130 * TILE_SIZE, y: 3 * TILE_SIZE, h: 9 * TILE_SIZE, reached: false, runaway: false, vx: 0 };

    this.initLevel1();
  }

  initLevel1() {
    const H = this.height;
    const TS = TILE_SIZE;

    // Base ground with gaps
    // Section 1: 0 to 22
    this.addGround(0, 22, 12);
    // Gap 1: 22 to 26 (Pit of doom)
    // Section 2: 26 to 48
    this.addGround(26, 48, 12);
    // Gap 2: 48 to 52
    // Section 3: 52 to 78
    this.addGround(52, 78, 12);
    // Gap 3: 78 to 83
    // Section 4: 83 to 140
    this.addGround(83, 140, 12);

    // Question Blocks & Bricks
    // First question block at x=7, y=8
    this.addBlock(7, 8, 'question', { trap: 'poison_shroom' });
    this.addBlock(8, 8, 'brick', { trap: 'fall_brick' });
    this.addBlock(9, 8, 'question', { trap: 'coin_bomb' });
    this.addBlock(10, 8, 'brick', { trap: 'none' });

    // TRAP 1: Invisible block right in front of Gap 1! (Mid-air jump denial)
    // When player jumps from x=21 to x=27, hitting x=23.5, y=9 bonks head down into pit!
    this.invisibleBlocks.push({
      x: 23 * TS,
      y: 8.5 * TS,
      w: TS,
      h: TS,
      revealed: false,
      message: 'Заблокировано! :)'
    });

    // TRAP 2: Second invisible block directly above Gap 1 for high jumpers
    this.invisibleBlocks.push({
      x: 24.5 * TS,
      y: 7 * TS,
      w: TS,
      h: TS,
      revealed: false,
      message: 'Не перепрыгнешь!'
    });

    // Pipe 1 at x=32
    this.addPipe(32, 10, 2, false);

    // TRAP 3: Pipe 2 at x=40: Fake pipe! If Mario stands near or jumps over, a giant piranha bites straight up
    this.addPipe(40, 9, 3, true);

    // TRAP 4: Collapsing bridge tiles at x=44 to 47
    for (let tx = 44; tx <= 47; tx++) {
      this.collapsingTiles.push({
        x: tx * TS,
        y: 12 * TS,
        w: TS,
        h: TS,
        triggered: false,
        timer: 0.12,
        vy: 0,
        falling: false
      });
    }

    // High platform over Gap 2 (x=50, y=7)
    this.addBlock(50, 7, 'brick', { trap: 'none' });
    // Bait coin on platform 50: if touched, falling ceiling spike!
    this.spikes.push({
      x: 50 * TS + 8,
      y: 0,
      w: 16,
      h: TS,
      active: false,
      direction: 'down',
      triggerX: 50 * TS
    });

    // Spring Trap at x=60: jumps Mario right into ceiling spikes
    this.addSpring(60, 11);
    this.spikes.push({
      x: 60 * TS - 8,
      y: 2 * TS,
      w: 48,
      h: 16,
      active: true,
      direction: 'down'
    });

    // TRAP 5: Troll Goombas
    // Goomba 1 at x=14: slow, but when jumped on, leaps up!
    this.enemies.push({
      x: 15 * TS,
      y: 11 * TS,
      w: TS,
      h: TS,
      vx: -1.2,
      vy: 0,
      type: 'troll_goomba',
      jumpedOn: false,
      alive: true
    });

    // Goomba 2 at x=68: Super-speed Dasher!
    this.enemies.push({
      x: 72 * TS,
      y: 11 * TS,
      w: TS,
      h: TS,
      vx: -1.0,
      vy: 0,
      type: 'ninja_goomba',
      triggered: false,
      alive: true
    });

    // Staircase before flagpole: x=115 to 125
    for (let step = 0; step < 8; step++) {
      for (let sy = 0; sy <= step; sy++) {
        this.addBlock(115 + step, 11 - sy, 'stair', { trap: step === 4 ? 'vanishing_step' : 'none' });
      }
    }

    // Dynamic triggers:
    // Trigger A: surprise missile from the back when approaching x=90
    this.triggers.push({
      x: 90 * TS,
      triggered: false,
      action: (game) => {
        game.enemies.push({
          x: game.camera.x - 20,
          y: (game.player.y),
          w: TS * 1.2,
          h: TS * 0.8,
          vx: 6.5,
          vy: 0,
          type: 'rear_missile',
          alive: true
        });
        window.soundEngine.trap();
      }
    });

    // Flagpole at x=130
    this.flagpole.x = 130 * TS;
    this.flagpole.y = 3 * TS;
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
      type: 'spring',
      compressed: false
    });
  }
}

window.LevelData = LevelData;
