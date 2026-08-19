import { describe, expect, it } from 'vitest';
import { shouldGameOwnMobileOrientation } from '../src/lifecycle/MobileOrientationPolicy';

const directMobilePlayer = {
  playerExperience: true,
  mobileDevice: true,
  embedded: false,
};

describe('mobile orientation ownership', () => {
  it('keeps direct and shareable mobile builds landscape-only', () => {
    expect(shouldGameOwnMobileOrientation(directMobilePlayer)).toBe(true);
  });

  it('delegates embedded launches to the host', () => {
    expect(shouldGameOwnMobileOrientation({ ...directMobilePlayer, embedded: true })).toBe(false);
  });

  it('never applies the phone gate to desktop or Sandbox profiles', () => {
    expect(shouldGameOwnMobileOrientation({ ...directMobilePlayer, mobileDevice: false })).toBe(false);
    expect(shouldGameOwnMobileOrientation({ ...directMobilePlayer, playerExperience: false })).toBe(false);
  });
});
