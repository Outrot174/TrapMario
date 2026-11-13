// Authentic 1985 NES 2A03 Audio Synthesizer for TrapMario
// Uses Pulse Wave (Square with customizable duty) and Triangle Wave

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.bgmPlaying = false;
    this.bgmStep = 0;
    this.bgmTimeout = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Play a single retro note
  playPulse(freq, duration, type = 'square', vol = 0.15) {
    if (this.muted || !this.ctx || freq <= 0) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + duration);
  }

  // Iconic Mario Jump Sound (sweep frequency)
  jump() {
    this.init();
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(620, t + 0.18);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  // Head bump into block (especially Kaizo invisible blocks!)
  bonk() {
    this.init();
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.setValueAtTime(55, t + 0.08);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  // Coin ping
  coin() {
    this.init();
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.playPulse(987.77, 0.08, 'sine', 0.25);
    setTimeout(() => {
      this.playPulse(1318.51, 0.35, 'sine', 0.25);
    }, 70);
  }

  // Stomp enemy
  stomp() {
    this.init();
    this.playPulse(120, 0.12, 'square', 0.25);
  }

  // Trap surprise sound
  trap() {
    this.init();
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(750, t);
    osc.frequency.linearRampToValueAtTime(180, t + 0.22);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  // Iconic Mario Death Jingle
  die() {
    this.init();
    this.stopBgm();
    if (this.muted || !this.ctx) return;
    // B4, F5, F5, F5, E5, D5, C5
    const notes = [
      { f: 493.88, d: 0.12 },
      { f: 698.46, d: 0.12 },
      { f: 0,      d: 0.05 },
      { f: 698.46, d: 0.12 },
      { f: 698.46, d: 0.12 },
      { f: 659.25, d: 0.12 },
      { f: 587.33, d: 0.12 },
      { f: 523.25, d: 0.35 }
    ];
    let offset = 0;
    notes.forEach(n => {
      setTimeout(() => {
        if (n.f > 0) this.playPulse(n.f, n.d, 'triangle', 0.3);
      }, offset * 1000);
      offset += n.d;
    });
  }

  // Level Clear Fanfare
  win() {
    this.init();
    this.stopBgm();
    if (this.muted || !this.ctx) return;
    const notes = [
      { f: 392, d: 0.12 }, { f: 523.25, d: 0.12 }, { f: 659.25, d: 0.12 },
      { f: 783.99, d: 0.12 }, { f: 659.25, d: 0.12 }, { f: 783.99, d: 0.35 }
    ];
    let offset = 0;
    notes.forEach(n => {
      setTimeout(() => {
        this.playPulse(n.f, n.d, 'square', 0.25);
      }, offset * 1000);
      offset += n.d;
    });
  }

  // Authentic Super Mario Bros Theme (Overworld Loop)
  startBgm() {
    if (this.bgmPlaying || this.muted) return;
    this.init();
    this.bgmPlaying = true;
    this.bgmStep = 0;

    // Classic 1985 Melody Frequencies (Hz)
    const E7 = 659.25, C7 = 523.25, G7 = 783.99, G6 = 392.00;
    const A6 = 440.00, B6 = 493.88, Bb6 = 466.16;
    const F7 = 698.46, D7 = 587.33;

    const melody = [
      // Intro
      { f: E7, d: 0.12 }, { f: E7, d: 0.12 }, { f: 0, d: 0.12 }, { f: E7, d: 0.12 },
      { f: 0, d: 0.12 },  { f: C7, d: 0.12 }, { f: E7, d: 0.18 }, { f: G7, d: 0.28 },
      { f: 0, d: 0.28 },  { f: G6, d: 0.28 }, { f: 0, d: 0.28 },
      // Main phrase
      { f: C7, d: 0.18 }, { f: 0, d: 0.10 }, { f: G6, d: 0.18 }, { f: 0, d: 0.10 },
      { f: E7, d: 0.18 }, { f: 0, d: 0.10 }, { f: A6, d: 0.18 }, { f: B6, d: 0.18 },
      { f: Bb6, d: 0.12 }, { f: A6, d: 0.18 }, { f: G6, d: 0.15 }, { f: E7, d: 0.15 },
      { f: G7, d: 0.15 }, { f: A6, d: 0.18 }, { f: F7, d: 0.15 }, { f: G7, d: 0.15 },
      { f: E7, d: 0.18 }, { f: C7, d: 0.15 }, { f: D7, d: 0.15 }, { f: B6, d: 0.25 },
      { f: 0, d: 0.35 }
    ];

    const playNext = () => {
      if (!this.bgmPlaying || this.muted) return;
      const note = melody[this.bgmStep % melody.length];
      if (note.f > 0) {
        this.playPulse(note.f, note.d, 'square', 0.08);
      }
      this.bgmStep++;
      this.bgmTimeout = setTimeout(playNext, (note.d + 0.03) * 1000);
    };

    playNext();
  }

  stopBgm() {
    this.bgmPlaying = false;
    if (this.bgmTimeout) {
      clearTimeout(this.bgmTimeout);
      this.bgmTimeout = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopBgm();
    } else {
      this.startBgm();
    }
    return this.muted;
  }
}

window.soundEngine = new SoundEngine();
