/**
 * WAY OUT - Procedural Audio System
 * Uses Web Audio API for 100% offline, zero-asset-failure sound effects and atmospheric background ambience.
 */

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.soundEnabled = true;
    this.musicEnabled = true;
    this.ambientGain = null;
    this.isInitialized = false;

    this.initOnGesture = this.initOnGesture.bind(this);
    window.addEventListener('pointerdown', this.initOnGesture, { once: false });
    window.addEventListener('keydown', this.initOnGesture, { once: false });
  }

  initOnGesture() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.ctx && !this.isInitialized) {
      this.isInitialized = true;
      if (this.musicEnabled) this.startAmbience();
    }
  }

  startAmbience() {
    if (!this.ctx || this.ambientGain) return;
    try {
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(55, this.ctx.currentTime);

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(54.4, this.ctx.currentTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(130, this.ctx.currentTime);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(this.ambientGain);
      this.ambientGain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();
    } catch (e) {
      console.warn('Ambience sound creation notice:', e);
    }
  }

  play(name) {
    if (!this.soundEnabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    try {
      const t = this.ctx.currentTime;
      switch (name) {
        case 'footstep':
          this._playFootstep(t);
          break;
        case 'click':
          this._playClick(t);
          break;
        case 'unlock':
          this._playUnlock(t);
          break;
        case 'drawer':
          this._playDrawer(t);
          break;
        case 'crowbar':
          this._playCrowbar(t);
          break;
        case 'carpet':
          this._playCarpet(t);
          break;
        case 'phone_beep':
          this._playPhoneBeep(t);
          break;
        case 'code_ok':
          this._playCodeOk(t);
          break;
        case 'code_bad':
          this._playCodeBad(t);
          break;
        case 'gift':
          this._playGift(t);
          break;
        case 'door_open':
          this._playDoorOpen(t);
          break;
        case 'narrator':
          this._playNarrator(t);
          break;
        case 'pickup':
          this._playPickup(t);
          break;
      }
    } catch (err) {
      console.warn('Audio playback error:', err);
    }
  }

  _playFootstep(t) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  _playClick(t) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.04);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  _playUnlock(t) {
    [0, 0.07].forEach(offset => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1100 + offset * 800, t + offset);
      osc.frequency.exponentialRampToValueAtTime(320, t + offset + 0.06);
      gain.gain.setValueAtTime(0.2, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.06);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + offset);
      osc.stop(t + offset + 0.06);
    });
  }

  _playDrawer(t) {
    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(420, t);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);
  }

  _playCrowbar(t) {
    // Metal screech + snap
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.18);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  _playCarpet(t) {
    const bufferSize = this.ctx.sampleRate * 0.35;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.6));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, t);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);
  }

  _playPhoneBeep(t) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1330, t);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  _playCodeOk(t) {
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.08);
      gain.gain.setValueAtTime(0.18, t + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.3);
    });
  }

  _playCodeBad(t) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, t);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  _playGift(t) {
    [880, 1174, 1567].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.06);
      gain.gain.setValueAtTime(0.18, t + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.4);
    });
  }

  _playDoorOpen(t) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 1.2);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 1.2);
  }

  _playNarrator(t) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(950, t);
    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  _playPickup(t) {
    // Subtle crisp institutional chime (520Hz -> 784Hz)
    [523.25, 783.99].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.07);
      gain.gain.setValueAtTime(0.16, t + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + i * 0.07);
      osc.stop(t + i * 0.07 + 0.28);
    });
  }
}
