/**
 * Deterministic PRNG (mulberry32). All CA random choices must use this —
 * never Math.random — so campaign seeds and future lockstep stay reproducible.
 */
export class SeededRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Next float in [0, 1). */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Random boolean with probability p (default 0.5). */
  chance(p = 0.5): boolean {
    return this.next() < p;
  }

  /** -1 or +1 with equal probability. */
  sign(): -1 | 1 {
    return this.chance() ? 1 : -1;
  }
}
