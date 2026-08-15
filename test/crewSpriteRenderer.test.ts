import { describe, expect, it } from 'vitest';
import {
  CREW_SALVAGER_PAINTED_HEIGHT,
  CREW_SALVAGER_WORLD_SCALE,
  canUseSalvagerHudIcon,
  canDrawSalvager,
  crewSalvagerFrame,
} from '../src/render/CrewSpriteRenderer';
import type { Lemming } from '../src/sim/types';

function crew(overrides: Partial<Lemming> = {}): Lemming {
  return {
    id: 1,
    x: 100,
    y: 100,
    direction: 1,
    velocityY: 0,
    state: 'walker',
    buildSteps: 0,
    actionTimerMs: 0,
    fallStartY: 100,
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

describe('salvage crew sprite slice', () => {
  it('maps walker and basher cycles into separate cached atlas ranges', () => {
    expect([0, 1, 2, 3].map((frame) => crewSalvagerFrame({ state: 'walker' }, frame))).toEqual([0, 1, 2, 3]);
    expect([0, 1, 2, 3].map((frame) => crewSalvagerFrame({ state: 'basher' }, frame))).toEqual([4, 5, 6, 7]);
  });

  it('keeps every unauthored state on the complete procedural fallback', () => {
    expect(canDrawSalvager(crew())).toBe(true);
    expect(canDrawSalvager(crew({ state: 'basher' }))).toBe(true);
    for (const state of ['faller', 'shrug', 'builder', 'miner', 'digger', 'blocker', 'swimming'] as const) {
      expect(canDrawSalvager(crew({ state }))).toBe(false);
      expect(crewSalvagerFrame({ state }, 0)).toBeNull();
    }
  });

  it('preserves fuse, parachute, permanent-trait, and queued-role overlays via fallback', () => {
    expect(canDrawSalvager(crew({ fuseMs: 3000 }))).toBe(false);
    expect(canDrawSalvager(crew({ state: 'faller', isFloater: true }))).toBe(false);
    expect(canDrawSalvager(crew({ isClimber: true }))).toBe(false);
    expect(canDrawSalvager(crew({ isSwimmer: true }))).toBe(false);
    expect(canDrawSalvager(crew({ pendingHatchSkill: 'basher' }))).toBe(false);
  });

  it('paints at a readable iPhone-landscape size without changing simulation geometry', () => {
    const cssHeight = CREW_SALVAGER_PAINTED_HEIGHT * CREW_SALVAGER_WORLD_SCALE * (390 / 540);
    expect(cssHeight).toBeGreaterThanOrEqual(22);
    expect(cssHeight).toBeLessThanOrEqual(25);
  });

  it('contains the matching atlas HUD identity to the Level-1 slice', () => {
    expect(canUseSalvagerHudIcon('basher', true)).toBe(true);
    expect(canUseSalvagerHudIcon('basher', false)).toBe(false);
    expect(canUseSalvagerHudIcon('builder', true)).toBe(false);
  });
});
