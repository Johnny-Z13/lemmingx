import { describe, expect, it } from 'vitest';
import { colorToCss, crewColor, crewLabel, crewName, crewRole, crewState } from '../src/render/lemmingIdentity';
import type { Lemming } from '../src/sim/types';

function makeLemming(overrides: Partial<Lemming> = {}): Lemming {
  return {
    id: 1,
    x: 20,
    y: 20,
    direction: 1,
    velocityY: 0,
    state: 'walker',
    buildSteps: 0,
    actionTimerMs: 0,
    fallStartY: 20,
    isClimber: false,
    isFloater: false,
    isSwimmer: false,
    sealedMs: 0,
    fuseMs: null,
    squashMs: 0,
    pendingHatchSkill: null,
    ...overrides,
  };
}

describe('lemming identity', () => {
  it('uses deterministic names that wrap with the crew roster', () => {
    expect(crewName(1)).toBe('Milo');
    expect(crewName(21)).toBe('Milo');
  });

  it('separates an assigned bomber role from the live swimming state', () => {
    const lemming = makeLemming({ state: 'swimming', isSwimmer: true, fuseMs: 4200 });
    expect(crewRole(lemming)).toBe('Bomber');
    expect(crewState(lemming)).toBe('Swimming');
    expect(crewLabel(lemming)).toBe('Milo · Bomber · Swimming');
  });

  it('shares a stable CSS colour key for sprite and label rendering', () => {
    expect(colorToCss(crewColor(makeLemming({ state: 'digger' })))).toBe('#d696ff');
    expect(colorToCss(crewColor(makeLemming({ state: 'digger', fuseMs: 1000 })))).toBe('#ff7a3a');
  });
});
