import type { SimEventKind, TrapKind } from '../sim/types';

/**
 * Tiny synthesized sound layer — every sound is generated from oscillators and
 * noise at runtime, so there are no audio asset files to ship or license.
 *
 * The AudioContext can only start after a user gesture, so we lazily create it
 * on the first `unlock()` (called from a click/keydown) and no-op until then.
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  /** Per-kind throttle so rapid diggers/bashers don't machine-gun the speakers. */
  private lastPlayed: Partial<Record<SimEventKind, number>> = {};

  /** Create/resume the context. Safe to call repeatedly; needs a user gesture. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.25;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** Map a sim event to a sound. Unknown kinds are silently ignored. */
  play(kind: SimEventKind): void {
    if (this.muted || !this.ctx || !this.master) return;
    const now = this.ctx.currentTime;

    // Throttle the noisy repeating actions.
    const throttle: Partial<Record<SimEventKind, number>> = { dig: 0.09, bash: 0.07, build: 0.12, spawn: 0.05, clank: 0.15 };
    const minGap = throttle[kind];
    if (minGap !== undefined) {
      const last = this.lastPlayed[kind] ?? -Infinity;
      if (now - last < minGap) return;
      this.lastPlayed[kind] = now;
    }

    switch (kind) {
      case 'spawn':
        this.blip(660, 0.05, 'square', 0.5);
        break;
      case 'assign':
        this.blip(880, 0.07, 'triangle', 0.7);
        break;
      case 'exit':
        // Happy rising two-note "yippee".
        this.blip(784, 0.08, 'square', 0.7);
        this.blip(1175, 0.12, 'square', 0.7, 0.07);
        break;
      case 'dig':
      case 'bash':
        this.noise(0.06, 0.5, kind === 'bash' ? 2400 : 1400);
        break;
      case 'build':
        this.blip(523, 0.05, 'triangle', 0.5);
        break;
      case 'clank':
        // Metallic ping: a bright square hit with a fast ring-down.
        this.blip(1320, 0.09, 'square', 0.8, 0, 880);
        this.noise(0.04, 0.4, 3200);
        break;
      case 'splat':
        this.noise(0.14, 0.9, 700, true);
        break;
      case 'drown':
        this.blip(300, 0.18, 'sine', 0.7, 0, 120);
        break;
      case 'explode':
        this.noise(0.25, 1.0, 500, true);
        this.blip(90, 0.22, 'sawtooth', 0.8);
        break;
      case 'nuke':
        this.blip(140, 0.4, 'sawtooth', 0.8, 0, 60);
        break;
    }
  }

  /** Trap-specific kill sounds (the 'trap' event carries which machine fired). */
  playTrap(kind: TrapKind | undefined): void {
    if (this.muted || !this.ctx || !this.master) return;
    switch (kind) {
      case 'crusher':
        // Heavy slam: deep thud + dull metal ring.
        this.noise(0.18, 1.0, 320, true);
        this.blip(70, 0.2, 'sine', 0.9);
        break;
      case 'zapper':
        // Electric discharge: fast descending saw + crackle.
        this.blip(1600, 0.16, 'sawtooth', 0.7, 0, 180);
        this.noise(0.1, 0.5, 4200);
        break;
      case 'chomper':
      default:
        // Two quick snaps.
        this.noise(0.05, 0.8, 1100);
        this.noise(0.06, 0.8, 800);
        this.blip(220, 0.07, 'square', 0.6, 0.05, 110);
        break;
    }
  }

  /** A short tone. `glideTo` (Hz) optionally sweeps the pitch for a fall/whoop. */
  private blip(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain = 0.6,
    delay = 0,
    glideTo?: number,
  ): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(env).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  /** A filtered noise burst — for digging crunch, splats, explosions. */
  private noise(dur: number, gain: number, cutoff: number, lowpass = false): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const frames = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = lowpass ? 'lowpass' : 'bandpass';
    filter.frequency.value = cutoff;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(gain * 0.5, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(env).connect(this.master);
    src.start(t);
    src.stop(t + dur);
  }
}
