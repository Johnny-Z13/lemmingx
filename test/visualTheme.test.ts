import { describe, expect, it } from 'vitest';
import { isVisualSurface, visualHash } from '../src/render/visualTheme';

describe('render-only visual theme helpers', () => {
  it('produces stable coordinate variation without a random source', () => {
    expect(visualHash(12, 34)).toBe(visualHash(12, 34));
    expect(visualHash(12, 34)).not.toBe(visualHash(13, 34));
    expect(visualHash(12, 34, 7)).not.toBe(visualHash(12, 34));
  });

  it('treats air, water, and fire boundaries as visible terrain surfaces', () => {
    expect(isVisualSurface(0)).toBe(true);
    expect(isVisualSurface(6)).toBe(true);
    expect(isVisualSurface(8)).toBe(true);
    expect(isVisualSurface(1)).toBe(false);
    expect(isVisualSurface(2)).toBe(false);
  });
});
