import { describe, expect, it } from 'vitest';
import { CROWD_SPACING, layoutLemmingCrowds, SALVAGER_CROWD_SPACING } from '../src/render/crowdLayout';
import type { Lemming } from '../src/sim/types';

function makeLemming(id: number, x: number, y = 100): Lemming {
  return {
    id,
    x,
    y,
    direction: 1,
    velocityY: 0,
    state: 'walker',
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

describe('crowd display layout', () => {
  it('fans a stack to about half-sprite spacing around its sim position', () => {
    const lemmings = [makeLemming(1, 100), makeLemming(2, 100), makeLemming(3, 100)];
    const points = layoutLemmingCrowds(lemmings, 0, SALVAGER_CROWD_SPACING);
    const xs = lemmings.map((lemming) => points.get(lemming.id)?.x ?? 0).sort((a, b) => a - b);

    expect(xs[1] - xs[0]).toBeGreaterThanOrEqual(12.5);
    expect(xs[2] - xs[1]).toBeGreaterThanOrEqual(12.5);
    expect((xs[0] + xs[1] + xs[2]) / 3).toBeCloseTo(100);
    expect(SALVAGER_CROWD_SPACING).toBe(13);
    expect(lemmings.map((lemming) => lemming.x)).toEqual([100, 100, 100]);
  });

  it('gives grouped individuals subtle deterministic motion without moving singletons', () => {
    const stacked = [makeLemming(1, 100), makeLemming(2, 100)];
    const first = layoutLemmingCrowds(stacked, 100);
    const later = layoutLemmingCrowds(stacked, 300);
    const singleton = makeLemming(3, 180);
    const alone = layoutLemmingCrowds([singleton], 300).get(singleton.id);

    expect(later.get(1)?.y).not.toBe(first.get(1)?.y);
    expect(layoutLemmingCrowds(stacked, 100)).toEqual(first);
    expect(alone).toEqual({ x: singleton.x, y: singleton.y });
  });

  it('does not crowd lemmings on different ledges', () => {
    const upper = makeLemming(1, 100, 80);
    const lower = makeLemming(2, 100, 100);
    const points = layoutLemmingCrowds([upper, lower], 500);

    expect(points.get(upper.id)).toEqual({ x: upper.x, y: upper.y });
    expect(points.get(lower.id)).toEqual({ x: lower.x, y: lower.y });
  });

  it('keeps ten overlapping crew grounded in a readable horizontal fan', () => {
    const lemmings = Array.from({ length: 10 }, (_, index) => makeLemming(index + 1, 100));
    const points = layoutLemmingCrowds(lemmings, 0, SALVAGER_CROWD_SPACING);
    const xs = lemmings.map(({ id }) => points.get(id)?.x ?? 0);
    const ys = lemmings.map(({ id }) => points.get(id)?.y ?? 0);

    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThanOrEqual(116);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThanOrEqual(119);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThanOrEqual(1.5);
    expect(xs.reduce((sum, value) => sum + value, 0) / xs.length).toBeCloseTo(100);
    expect(ys.reduce((sum, value) => sum + value, 0) / ys.length).toBeCloseTo(100);
  });

  it('keeps each crew slot stable when jobs and fuses change', () => {
    const lemmings = [makeLemming(3, 100), makeLemming(1, 100), makeLemming(2, 100)];
    const before = layoutLemmingCrowds(lemmings, 250, SALVAGER_CROWD_SPACING);
    const changed = lemmings.map((lemming) => ({ ...lemming }));
    changed[0].state = 'basher';
    changed[1].fuseMs = 2500;
    const after = layoutLemmingCrowds(changed, 250, SALVAGER_CROWD_SPACING);

    for (const lemming of lemmings) expect(after.get(lemming.id)).toEqual(before.get(lemming.id));
  });

  it('fans ordinary six-pixel walking gaps without pulling nearby ledges together', () => {
    const walking = [makeLemming(1, 100), makeLemming(2, 106), makeLemming(3, 112)];
    const points = layoutLemmingCrowds(walking, 400, SALVAGER_CROWD_SPACING);
    const xs = walking.map(({ id }) => points.get(id)?.x ?? 0).sort((a, b) => a - b);

    expect(xs[1] - xs[0]).toBeGreaterThan(12.5);
    expect(xs[2] - xs[1]).toBeGreaterThan(12.5);
    expect(xs.reduce((sum, x) => sum + x, 0) / xs.length).toBeCloseTo(106);
  });

  it('retains the compact procedural fan outside the Level-1 slice', () => {
    const lemmings = [makeLemming(1, 100), makeLemming(2, 100), makeLemming(3, 100)];
    const points = layoutLemmingCrowds(lemmings, 0);
    const xs = lemmings.map(({ id }) => points.get(id)?.x ?? 0).sort((a, b) => a - b);

    expect(CROWD_SPACING).toBe(7.5);
    expect(xs[2] - xs[0]).toBeGreaterThanOrEqual(14.5);
    expect(xs[2] - xs[0]).toBeLessThanOrEqual(15.5);
  });
});
