import { describe, expect, it } from 'vitest';
import { isVisualSurface, visualHash, WORLD_THEME } from '../src/render/visualTheme';

function luminance(color: number): number {
  const red = (color >>> 16) & 0xff;
  const green = (color >>> 8) & 0xff;
  const blue = color & 0xff;
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

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

  it('keeps the material value hierarchy readable without a global grade', () => {
    expect(luminance(WORLD_THEME.sandLight)).toBeGreaterThan(luminance(WORLD_THEME.dirtMid));
    expect(luminance(WORLD_THEME.waterLight)).toBeGreaterThan(luminance(WORLD_THEME.waterDeep));
    expect(luminance(WORLD_THEME.steelLight)).toBeGreaterThan(luminance(WORLD_THEME.steelDark));
    expect(WORLD_THEME.mint).not.toBe(WORLD_THEME.waterLight);
    expect(WORLD_THEME.danger).not.toBe(WORLD_THEME.fire);
  });
});
