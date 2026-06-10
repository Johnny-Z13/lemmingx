import { TRACKS, type Track } from './tracks';

/**
 * Tiny chiptune sequencer: schedules the current track's steps a short
 * lookahead window into the future against AudioContext.currentTime, so
 * playback stays steady regardless of frame rate or tab throttling.
 *
 * Like Sfx, the context can only start after a user gesture: `play()` before
 * `unlock()` just remembers the track, and unlock starts it.
 */

const LOOKAHEAD_S = 0.12;
const TICK_MS = 25;

/** 'C4' / 'F#5' / 'Bb3' → frequency in Hz. */
function noteToFreq(name: string): number {
  const match = /^([A-G])(#|b)?(\d)$/.exec(name);
  if (!match) return 440;
  const semis: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let midi = 12 * (Number(match[3]) + 1) + semis[match[1]];
  if (match[2] === '#') midi += 1;
  if (match[2] === 'b') midi -= 1;
  return 440 * 2 ** ((midi - 69) / 12);
}

export class Music {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private timer: number | null = null;
  private track: Track | null = null;
  private step = 0;
  private nextStepAt = 0;
  private muted = false;
  private volume = 0.5;

  /** Create/resume the context (needs a user gesture) and start the scheduler. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.gainValue();
      this.master.connect(this.ctx.destination);

      const frames = Math.floor(this.ctx.sampleRate * 0.25);
      this.noiseBuffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (this.timer === null) {
      this.nextStepAt = this.ctx.currentTime + 0.05;
      this.timer = window.setInterval(() => this.tick(), TICK_MS);
    }
  }

  /** Select a track (wrapping) and restart it from the top. */
  play(trackIndex: number): void {
    this.track = TRACKS[((trackIndex % TRACKS.length) + TRACKS.length) % TRACKS.length];
    this.step = 0;
    if (this.ctx) this.nextStepAt = this.ctx.currentTime + 0.05;
  }

  stop(): void {
    this.track = null;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyGain();
  }

  isMuted(): boolean {
    return this.muted;
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    this.applyGain();
  }

  getVolume(): number {
    return this.volume;
  }

  /** Briefly dip the music (e.g. under the nuke klaxon). */
  duck(ms: number): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const g = this.master.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(this.gainValue() * 0.25, t);
    g.linearRampToValueAtTime(this.gainValue(), t + ms / 1000);
  }

  private gainValue(): number {
    return this.muted ? 0 : 0.16 * this.volume * 2;
  }

  private applyGain(): void {
    if (this.master && this.ctx) this.master.gain.setValueAtTime(this.gainValue(), this.ctx.currentTime);
  }

  private tick(): void {
    if (!this.ctx || !this.track) return;
    const stepDur = 60 / this.track.bpm / 2; // eighth notes
    while (this.nextStepAt < this.ctx.currentTime + LOOKAHEAD_S) {
      this.scheduleStep(this.track, this.step % this.track.lead.length, this.nextStepAt, stepDur);
      this.step += 1;
      this.nextStepAt += stepDur;
    }
  }

  private scheduleStep(track: Track, index: number, at: number, stepDur: number): void {
    const lead = track.lead[index];
    const harmony = track.harmony[index];
    const bass = track.bass[index];
    const hit = track.noise[index] ?? 0;

    if (lead) this.voice('square', noteToFreq(lead), at, stepDur * 0.9, 0.5);
    if (harmony) this.voice('square', noteToFreq(harmony), at, stepDur * 0.9, 0.22);
    if (bass) this.voice('triangle', noteToFreq(bass), at, stepDur * 1.8, 0.55);
    if (hit === 1) this.noiseHit(at, 0.03, 6000, 0.18);
    if (hit === 2) this.noiseHit(at, 0.07, 900, 0.5);
  }

  private voice(type: OscillatorType, freq: number, at: number, dur: number, gain: number): void {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(gain, at + 0.01);
    env.gain.setValueAtTime(gain, at + dur * 0.6);
    env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(env).connect(this.master);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  private noiseHit(at: number, dur: number, cutoff: number, gain: number): void {
    if (!this.ctx || !this.master || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = cutoff > 2000 ? 'highpass' : 'lowpass';
    filter.frequency.value = cutoff;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(gain, at);
    env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(filter).connect(env).connect(this.master);
    src.start(at);
    src.stop(at + dur);
  }
}
