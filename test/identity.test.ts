import { describe, expect, it } from 'vitest';
import {
  colorToCss,
  crewColor,
  crewLabel,
  crewName,
  crewPalette,
  crewRole,
  crewState,
  skillPalette,
} from '../src/render/lemmingIdentity';
import { ALL_SKILLS, type Lemming } from '../src/sim/types';

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

  it('gives every crew role a distinct full uniform palette', () => {
    const roleExamples = [
      makeLemming(),
      makeLemming({ isClimber: true }),
      makeLemming({ isFloater: true }),
      makeLemming({ fuseMs: 1000 }),
      makeLemming({ state: 'blocker' }),
      makeLemming({ state: 'builder' }),
      makeLemming({ state: 'basher' }),
      makeLemming({ state: 'miner' }),
      makeLemming({ state: 'digger' }),
      makeLemming({ isSwimmer: true }),
    ];
    const schemes = roleExamples.map((lemming) => Object.values(crewPalette(lemming)).join(':'));

    expect(new Set(schemes).size).toBe(roleExamples.length);
    ALL_SKILLS.forEach((skill, index) => {
      expect(skillPalette(skill)).toEqual(crewPalette(roleExamples[index + 1]));
    });
  });

  it('shows a hatch-queued ground role while its lemming is still falling', () => {
    const queuedDigger = makeLemming({ state: 'faller', pendingHatchSkill: 'digger' });

    expect(crewRole(queuedDigger)).toBe('Digger');
    expect(colorToCss(crewPalette(queuedDigger).body)).toBe('#704bb8');
  });

  it('labels a dead lemming as dead rather than down', () => {
    expect(crewState(makeLemming({ state: 'dead' }))).toBe('Dead');
  });
});
