import { describe, expect, it } from 'vitest';
import { RenderMotionPreference, type MotionMediaQueryList } from '../src/render/motionPreference';

class FakeMotionQuery implements MotionMediaQueryList {
  matches = false;
  private listener?: (event: { matches: boolean }) => void;

  addEventListener(_type: 'change', listener: (event: { matches: boolean }) => void): void {
    this.listener = listener;
  }

  removeEventListener(_type: 'change', listener: (event: { matches: boolean }) => void): void {
    if (this.listener === listener) this.listener = undefined;
  }

  change(matches: boolean): void {
    this.matches = matches;
    this.listener?.({ matches });
  }
}

describe('RenderMotionPreference', () => {
  it('tracks live reduced-motion changes and detaches on stop', () => {
    const query = new FakeMotionQuery();
    const queries: string[] = [];
    const preference = new RenderMotionPreference();
    preference.start((value) => {
      queries.push(value);
      return query;
    });

    expect(queries).toEqual(['(prefers-reduced-motion: reduce)']);
    expect(preference.reduced).toBe(false);
    query.change(true);
    expect(preference.reduced).toBe(true);
    preference.stop();
    query.change(false);
    expect(preference.reduced).toBe(true);
  });

  it('fails open when matchMedia is unavailable', () => {
    const preference = new RenderMotionPreference();
    preference.reduced = true;
    preference.start(undefined);
    expect(preference.reduced).toBe(false);
  });
});
