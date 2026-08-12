/** Scene-shell clock for deterministic headless simulation advancement. */

export const SIM_STEP_MS = 16;
export const MAX_SIM_STEPS_PER_FRAME = 8;
const STEP_EPSILON_MS = 1e-7;

export interface FixedStepClockOptions {
  stepMs?: number;
  maxStepsPerFrame?: number;
}

export class FixedStepClock {
  private readonly stepMs: number;
  private readonly maxStepsPerFrame: number;
  private accumulatorMs = 0;

  constructor(options: FixedStepClockOptions = {}) {
    this.stepMs = options.stepMs ?? SIM_STEP_MS;
    this.maxStepsPerFrame = options.maxStepsPerFrame ?? MAX_SIM_STEPS_PER_FRAME;
    if (!(this.stepMs > 0) || !Number.isFinite(this.stepMs)) {
      throw new Error('FixedStepClock stepMs must be a finite positive number');
    }
    if (!Number.isInteger(this.maxStepsPerFrame) || this.maxStepsPerFrame <= 0) {
      throw new Error('FixedStepClock maxStepsPerFrame must be a positive integer');
    }
  }

  /**
   * Advance by active wall time. Excess work is dropped rather than retained as
   * a permanent catch-up debt; focus lifecycle code calls reset() on pauses.
   */
  advance(frameDeltaMs: number, rate: number, onStep: (stepMs: number) => void): number {
    const safeDelta = Number.isFinite(frameDeltaMs) ? Math.max(0, frameDeltaMs) : 0;
    const safeRate = Number.isFinite(rate) ? Math.max(0, rate) : 0;
    const maxAdvanceMs = this.stepMs * this.maxStepsPerFrame;
    this.accumulatorMs += Math.min(safeDelta * safeRate, maxAdvanceMs);

    let steps = 0;
    while (this.accumulatorMs + STEP_EPSILON_MS >= this.stepMs && steps < this.maxStepsPerFrame) {
      this.accumulatorMs = Math.max(0, this.accumulatorMs - this.stepMs);
      onStep(this.stepMs);
      steps += 1;
    }

    if (steps === this.maxStepsPerFrame && this.accumulatorMs >= this.stepMs) {
      this.accumulatorMs %= this.stepMs;
    }
    return steps;
  }

  reset(): void {
    this.accumulatorMs = 0;
  }

  remainderMs(): number {
    return this.accumulatorMs;
  }
}
