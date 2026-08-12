import { describe, expect, it } from 'vitest';
import { selectCrewTarget } from '../src/input/crewTargeting';
import type { Lemming } from '../src/sim/types';

function crew(id: number, x: number, y: number, state: Lemming['state'] = 'walker'): Lemming {
  return {
    id,
    x,
    y,
    direction: 1,
    velocityY: 0,
    state,
    buildSteps: 0,
    actionTimerMs: 0,
    fallStartY: y,
    isClimber: false,
    isFloater: false,
    isSwimmer: false,
    sealedMs: 0,
    fuseMs: null,
    squashMs: 0,
    pendingHatchSkill: null,
  };
}

describe('selectCrewTarget', () => {
  it('uses display positions and ignores dead or exited crew', () => {
    const lemmings = [crew(1, 100, 100), crew(2, 100, 100, 'dead')];
    const display = new Map([
      [1, { x: 124, y: 100 }],
      [2, { x: 100, y: 100 }],
    ]);
    expect(selectCrewTarget(lemmings, display, 124, 104, 24)?.id).toBe(1);
    expect(selectCrewTarget(lemmings, display, 100, 104, 8)).toBeNull();
  });

  it('breaks exact overlap ties by frontmost display Y, then stable ID', () => {
    const lemmings = [crew(9, 100, 100), crew(4, 100, 100), crew(2, 100, 100)];
    const display = new Map([
      [9, { x: 100, y: 101 }],
      [4, { x: 100, y: 103 }],
      [2, { x: 100, y: 103 }],
    ]);
    expect(selectCrewTarget(lemmings, display, 100, 106, 24)?.id).toBe(2);
  });
});
