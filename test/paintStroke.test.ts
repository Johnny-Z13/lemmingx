import { describe, expect, it } from 'vitest';
import { interpolatePaintStroke } from '../src/input/paintStroke';

describe('interpolatePaintStroke', () => {
  it('fills a sparse mobile move with stable, evenly spaced stamps', () => {
    expect(interpolatePaintStroke({ x: 0, y: 0 }, { x: 30, y: 0 }, 12)).toEqual([
      { x: 12, y: 0 },
      { x: 24, y: 0 },
    ]);
  });

  it('does not stamp before the movement threshold', () => {
    expect(interpolatePaintStroke({ x: 3, y: 4 }, { x: 8, y: 4 }, 8)).toEqual([]);
  });
});
