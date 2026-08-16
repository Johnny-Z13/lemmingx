import { describe, expect, it } from 'vitest';
import { heroMoveChargesForLevel, heroMoveControlState } from '../src/input/heroMove';

describe('hero move charges', () => {
  it('keeps interventions to two or three moments across campaign levels', () => {
    expect(Array.from({ length: 10 }, (_, index) => heroMoveChargesForLevel(index, 10)))
      .toEqual([2, 2, 2, 2, 2, 2, 2, 3, 3, 3]);
  });

  it('does not expose campaign hero moves in prototype or lab slots', () => {
    expect(heroMoveChargesForLevel(10, 10)).toBe(0);
    expect(heroMoveChargesForLevel(12, 10)).toBe(0);
  });

  it('hides Hero when a locked level has no assignable crew skill', () => {
    expect(heroMoveControlState(2, false, true)).toEqual({ visible: false, canArm: false });
  });

  it('disables Hero honestly while a landscape or world tool is armed', () => {
    expect(heroMoveControlState(2, true, true)).toEqual({ visible: true, canArm: false });
    expect(heroMoveControlState(2, true, false)).toEqual({ visible: true, canArm: true });
  });
});
