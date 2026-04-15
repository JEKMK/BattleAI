/**
 * AudioEngine — synthesized SFX + adaptive ambient drone.
 * Zero audio files. Everything generated with Web Audio API.
 * Carmack-approved: lightweight, no dependencies, mobile-safe.
 */

type SfxName = "punch" | "shoot" | "heavy" | "block" | "dodge" | "parry" | "miss" | "hit" | "ko" | "stun";

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private muted = false;
  private initialized = false;

  /** Must call after user interaction (click/keypress) to unlock AudioContext */
  init() {
    if (this.initialized) return;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.7;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.8;
      this.sfxGain.connect(this.masterGain);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.0; // starts silent, ramps up
      this.ambientGain.connect(this.masterGain);

      this.initialized = true;
    } catch {
      // Web Audio not supported — silent fallback
    }
  }

  play(sfx: SfxName) {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    if (this.ctx.state === "suspended") this.ctx.resume();

    const t = this.ctx.currentTime;
    const out = this.sfxGain;

    switch (sfx) {
      case "punch": {
        // Square wave 200→80Hz sweep + noise burst
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.1);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        osc.connect(gain).connect(out);
        osc.start(t);
        osc.stop(t + 0.12);
        this.noiseHit(t, 0.05, 0.15, out);
        break;
      }
      case "shoot": {
        // Sawtooth 800→200Hz sweep + delay feel
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.2);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
        osc.connect(gain).connect(out);
        osc.start(t);
        osc.stop(t + 0.25);
        // Echo
        const osc2 = this.ctx.createOscillator();
        const g2 = this.ctx.createGain();
        osc2.type = "sawtooth";
        osc2.frequency.setValueAtTime(600, t + 0.05);
        osc2.frequency.exponentialRampToValueAtTime(150, t + 0.2);
        g2.gain.setValueAtTime(0.08, t + 0.05);
        g2.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
        osc2.connect(g2).connect(out);
        osc2.start(t + 0.05);
        osc2.stop(t + 0.25);
        break;
      }
      case "heavy": {
        // Deep square 100→40Hz + noise + distortion feel
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
        osc.connect(gain).connect(out);
        osc.start(t);
        osc.stop(t + 0.2);
        this.noiseHit(t, 0.1, 0.25, out);
        break;
      }
      case "block": {
        // Metallic tink — sine 500Hz short
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(500, t);
        osc.frequency.setValueAtTime(700, t + 0.02);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);
        const hp = this.ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 400;
        osc.connect(hp).connect(gain).connect(out);
        osc.start(t);
        osc.stop(t + 0.06);
        break;
      }
      case "dodge": {
        // Whoosh — sine sweep up 1200→2000Hz
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(2000, t + 0.08);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.connect(gain).connect(out);
        osc.start(t);
        osc.stop(t + 0.1);
        break;
      }
      case "parry": {
        // Electric crunch — square 400→800→400Hz + distortion
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.linearRampToValueAtTime(800, t + 0.05);
        osc.frequency.linearRampToValueAtTime(400, t + 0.1);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        const dist = this.makeDistortion(50);
        if (dist) osc.connect(dist).connect(gain).connect(out);
        else osc.connect(gain).connect(out);
        osc.start(t);
        osc.stop(t + 0.12);
        break;
      }
      case "miss": {
        // Soft puff — noise 30ms low
        this.noiseHit(t, 0.03, 0.08, out);
        break;
      }
      case "hit": {
        // Satisfying ding — dual sine chord
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.value = 600;
        osc2.type = "sine";
        osc2.frequency.value = 900;
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(out);
        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.1);
        osc2.stop(t + 0.1);
        break;
      }
      case "ko": {
        // System crash — deep sweep down + noise crescendo + cut
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(20, t + 0.5);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.setValueAtTime(0.4, t + 0.45);
        gain.gain.linearRampToValueAtTime(0, t + 0.5); // abrupt cut
        osc.connect(gain).connect(out);
        osc.start(t);
        osc.stop(t + 0.55);
        this.noiseHit(t, 0.4, 0.35, out);
        break;
      }
      case "stun": {
        // Electric buzz — square 300Hz with tremolo
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        osc.type = "square";
        osc.frequency.value = 300;
        lfo.frequency.value = 30;
        lfoGain.gain.value = 0.15;
        lfo.connect(lfoGain).connect(gain.gain);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        osc.connect(gain).connect(out);
        osc.start(t);
        lfo.start(t);
        osc.stop(t + 0.12);
        lfo.stop(t + 0.12);
        break;
      }
    }
  }

  /** Start ambient drone — call when battle begins */
  startAmbient() {
    if (!this.ctx || !this.ambientGain) return;
    this.stopAmbient();

    const t = this.ctx.currentTime;
    this.ambientGain.gain.setValueAtTime(0, t);
    this.ambientGain.gain.linearRampToValueAtTime(0.08, t + 2);

    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc1.type = "sine";
    this.droneOsc1.frequency.value = 55;
    this.droneOsc1.connect(this.ambientGain);
    this.droneOsc1.start(t);

    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc2.type = "sine";
    this.droneOsc2.frequency.value = 82;
    const g2 = this.ctx.createGain();
    g2.gain.value = 0.5;
    this.droneOsc2.connect(g2).connect(this.ambientGain);
    this.droneOsc2.start(t);
  }

  /** Update ambient tension based on battle state */
  updateTension(tick: number, hpRatio: number) {
    if (!this.ctx || !this.ambientGain || !this.droneOsc1) return;
    const t = this.ctx.currentTime;

    // Volume ramps up with ticks
    let vol = 0.08;
    if (tick > 30) vol = 0.1;
    if (tick > 60) vol = 0.13;
    if (tick > 90) vol = 0.16;

    // Pitch rises when HP is low
    if (hpRatio < 0.3) {
      this.droneOsc1.frequency.setTargetAtTime(70, t, 0.5);
      vol += 0.04;
    } else {
      this.droneOsc1.frequency.setTargetAtTime(55, t, 0.5);
    }

    this.ambientGain.gain.setTargetAtTime(vol, t, 0.3);
  }

  /** Stop ambient — call when battle ends */
  stopAmbient() {
    try {
      this.droneOsc1?.stop();
      this.droneOsc2?.stop();
    } catch { /* already stopped */ }
    this.droneOsc1 = null;
    this.droneOsc2 = null;
    if (this.ambientGain) {
      this.ambientGain.gain.setTargetAtTime(0, this.ctx?.currentTime ?? 0, 0.3);
    }
  }

  /** Play victory chord */
  playVictory() {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const t = this.ctx.currentTime;
    [523, 659, 784].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.15, t + i * 0.1 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
      osc.connect(gain).connect(this.sfxGain!);
      osc.start(t + i * 0.1);
      osc.stop(t + 0.8);
    });
  }

  /** Play defeat drone-down */
  playDefeat() {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 1);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 1.2);
    osc.connect(gain).connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 1.2);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 0.7;
    }
    return this.muted;
  }

  isMuted() { return this.muted; }

  private noiseHit(time: number, duration: number, volume: number, dest: AudioNode) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize); // fade out
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(dest);
    source.start(time);
  }

  private makeDistortion(amount: number): WaveShaperNode | null {
    if (!this.ctx) return null;
    const ws = this.ctx.createWaveShaper();
    const samples = 256;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
    }
    ws.curve = curve;
    ws.oversample = "2x";
    return ws;
  }
}

// Singleton
export const audioEngine = new AudioEngine();
