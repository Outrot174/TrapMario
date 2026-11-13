// Procedural 8-bit Web Audio Sound Synthesizer for TrapMario
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.bgmPlaying = false;
    this.bgmTimer = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type, duration, startVol = 0.2, endVol = 0.001) {
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(startVol, t);
    gain.gain.exponentialRampToValueAtTime(endVol, t + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + duration);
  }

  jump() {
    this.init();
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.15);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  bonk() {
    this.init();
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.setValueAtTime(60, t + 0.05);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  coin() {
    this.init();
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, t); // B5
    osc.frequency.setValueAtTime(1318.51, t + 0.08); // E6

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  trap() {
    this.init();
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.linearRampToValueAtTime(200, t + 0.2);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  die() {
    this.init();
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = [440, 415, 392, 370, 330, 220, 110];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = t + idx * 0.07;

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.3, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.01, noteTime + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(noteTime);
      osc.stop(noteTime + 0.09);
    });
  }

  win() {
    this.init();
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = t + idx * 0.1;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.25, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.01, noteTime + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(noteTime);
      osc.stop(noteTime + 0.25);
    });
  }

  startBgm() {
    if (this.bgmPlaying || this.muted) return;
    this.init();
    this.bgmPlaying = true;
    let step = 0;
    const bassline = [130.81, 130.81, 164.81, 196.00, 130.81, 146.83, 164.81, 196.00];

    const tick = () => {
      if (!this.bgmPlaying) return;
      if (!this.muted && this.ctx && this.ctx.state === 'running') {
        const freq = bassline[step % bassline.length];
        this.playTone(freq, 'triangle', 0.12, 0.08, 0.005);
      }
      step++;
      this.bgmTimer = setTimeout(tick, 180);
    };
    tick();
  }

  stopBgm() {
    this.bgmPlaying = false;
    if (this.bgmTimer) clearTimeout(this.bgmTimer);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) this.stopBgm();
    else this.startBgm();
    return this.muted;
  }
}

window.soundEngine = new SoundEngine();
