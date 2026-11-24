// Solmar Keys — synthesized sound, no audio files.
//
// Every sound is made with the Web Audio API: an engine hum that follows the
// car's speed, a two-tone police siren, and short blips for pickups, missions,
// punches and crashes. Nothing is loaded over the network, and everything stays
// silent until the player first interacts (the browser's autoplay rule).

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenTimer = 0;
    this.sirenHigh = false;
  }

  // Call from a user gesture (the Start button). Safe to call twice.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    // Engine: a low sawtooth through a low-pass filter, gain follows speed.
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    const engineFilter = this.ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(engineFilter).connect(this.engineGain).connect(this.ctx.destination);
    this.engineOsc.start();
    // Siren: a square wave that alternates between two notes.
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'square';
    this.sirenOsc.frequency.value = 660;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenOsc.connect(this.sirenGain).connect(this.ctx.destination);
    this.sirenOsc.start();
  }

  // speed01: 0 (parked) to 1 (top speed). Call every frame while driving.
  engine(speed01, driving) {
    if (!this.ctx || this.muted) return;
    const target = driving ? 0.05 + 0.06 * speed01 : 0;
    this.engineGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
    this.engineOsc.frequency.setTargetAtTime(50 + 130 * speed01, this.ctx.currentTime, 0.08);
  }

  // wanted01: 0 when no police are after the player. Call every frame.
  siren(dt, wantedLevel) {
    if (!this.ctx) return;
    if (wantedLevel >= 2 && !this.muted) {
      this.sirenTimer += dt;
      if (this.sirenTimer > 0.42) {
        this.sirenTimer = 0;
        this.sirenHigh = !this.sirenHigh;
        this.sirenOsc.frequency.value = this.sirenHigh ? 880 : 660;
      }
      this.sirenGain.gain.setTargetAtTime(0.035, this.ctx.currentTime, 0.1);
    } else {
      this.sirenGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
  }

  // A short two-note blip, e.g. picking something up.
  blip(freqA = 880, freqB = 1320) {
    this.tone(freqA, 0.09, 'sine', 0.08);
    setTimeout(() => this.tone(freqB, 0.12, 'sine', 0.08), 90);
  }

  // A little rising arpeggio for a finished mission.
  fanfare() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.16, 'triangle', 0.09), i * 110);
    });
  }

  // A dull thud: a punch landing, or a car bumping a wall.
  thud() {
    this.tone(90, 0.14, 'sine', 0.14);
  }

  // A crash: a burst of filtered noise.
  crash() {
    if (!this.ctx || this.muted) return;
    const dur = 0.22;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.16;
    src.connect(filter).connect(gain).connect(this.ctx.destination);
    src.start();
  }

  tone(freq, dur, type = 'sine', vol = 0.08) {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + dur + 0.02);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.ctx) {
      const v = this.muted ? 0 : 1;
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
      this.sirenGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
      void v;
    }
    return this.muted;
  }
}
