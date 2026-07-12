import { describe, expect, it } from 'vitest';
import { CROWD_SPACING, layoutLemmingCrowds } from '../src/render/crowdLayout';
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
    const points = layoutLemmingCrowds(lemmings, 0);
    const xs = lemmings.map((lemming) => points.get(lemming.id)?.x ?? 0).sort((a, b) => a - b);

    expect(xs[1] - xs[0]).toBeGreaterThanOrEqual(7);
    expect(xs[2] - xs[1]).toBeGreaterThanOrEqual(7);
    expect((xs[0] + xs[1] + xs[2]) / 3).toBeCloseTo(100);
    expect(CROWD_SPACING).toBe(7.5);
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
});
