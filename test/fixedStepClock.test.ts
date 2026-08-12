import { describe, expect, it } from 'vitest';
import { createLevel5 } from '../src/levels/level5';
import { FixedStepClock, MAX_SIM_STEPS_PER_FRAME, SIM_STEP_MS } from '../src/sim/FixedStepClock';
import { GameSimulation } from '../src/sim/GameSimulation';

describe('FixedStepClock', () => {
  it('accumulates partial frames and advances fixed 16 ms ticks', () => {
    const clock = new FixedStepClock();
    const steps: number[] = [];

    expect(clock.advance(7, 1, (step) => steps.push(step))).toBe(0);
    expect(clock.advance(9, 1, (step) => steps.push(step))).toBe(1);
    expect(steps).toEqual([SIM_STEP_MS]);
    expect(clock.remainderMs()).toBe(0);
  });

  it('applies speed as fixed-tick throughput', () => {
    const clock = new FixedStepClock();
    let steps = 0;

    clock.advance(16, 3, () => { steps += 1; });

    expect(steps).toBe(3);
  });

  it('caps catch-up work and reset discards paused wall time', () => {
    const clock = new FixedStepClock();
    let steps = 0;

    expect(clock.advance(10_000, 1, () => { steps += 1; })).toBe(MAX_SIM_STEPS_PER_FRAME);
    expect(steps).toBe(MAX_SIM_STEPS_PER_FRAME);
    clock.reset();
    expect(clock.advance(15, 1, () => { steps += 1; })).toBe(0);
  });

  it('produces equivalent seeded outcomes at 60, 144, and 165 Hz', () => {
    const at60 = runAtRefreshRate(60);
    expect(runAtRefreshRate(144)).toEqual(at60);
    expect(runAtRefreshRate(165)).toEqual(at60);
  });
});

function runAtRefreshRate(hz: number) {
  const level = createLevel5();
  const sim = new GameSimulation(level);
  const clock = new FixedStepClock();
  const durationMs = 8_000;
  const frameMs = 1_000 / hz;
  let elapsedMs = 0;

  while (elapsedMs < durationMs) {
    const deltaMs = Math.min(frameMs, durationMs - elapsedMs);
    clock.advance(deltaMs, 1, (stepMs) => sim.step(stepMs));
    elapsedMs += deltaMs;
  }

  return {
    timeMs: sim.state.timeMs,
    timeRemainingMs: sim.state.timeRemainingMs,
    spawned: sim.state.spawned,
    saved: sim.state.saved,
    lost: sim.state.lost,
    emitters: sim.state.emitters.map((emitter) => ({
      active: emitter.active,
      budgetLeft: emitter.budgetLeft,
      accumulatorCells: emitter.accumulatorCells,
    })),
    lemmings: sim.state.lemmings.map((lemming) => ({
      id: lemming.id,
      x: lemming.x,
      y: lemming.y,
      state: lemming.state,
      direction: lemming.direction,
    })),
    terrainHash: hashTerrain(level),
  };
}

function hashTerrain(level: ReturnType<typeof createLevel5>): number {
  let hash = 2166136261;
  for (let y = 0; y < level.terrain.rows; y += 1) {
    for (let x = 0; x < level.terrain.cols; x += 1) {
      hash ^= level.terrain.getCell(x, y);
      hash = Math.imul(hash, 16777619);
    }
  }
  return hash >>> 0;
}
