import { describe, expect, it } from 'vitest';
import { resolveDeviceProfile, type DeviceProfileInput } from '../src/deviceProfile';

const desktop: DeviceProfileInput = {
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  platform: 'MacIntel',
  maxTouchPoints: 0,
  mobileClientHint: false,
  anyPointerFine: true,
  primaryPointerCoarse: false,
  hoverNone: false,
};

describe('device profile', () => {
  it('keeps desktop browsers on Desktop regardless of viewport shape', () => {
    expect(resolveDeviceProfile(desktop)).toBe('desktop');
  });

  it('detects phones from established platform signals', () => {
    expect(resolveDeviceProfile({
      ...desktop,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
      platform: 'iPhone',
      maxTouchPoints: 5,
      anyPointerFine: false,
      primaryPointerCoarse: true,
      hoverNone: true,
    })).toBe('mobile');
  });

  it('detects classic and desktop-UA iPads as Mobile', () => {
    expect(resolveDeviceProfile({
      ...desktop,
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)',
      platform: 'iPad',
      maxTouchPoints: 5,
    })).toBe('mobile');
    expect(resolveDeviceProfile({
      ...desktop,
      platform: 'MacIntel',
      maxTouchPoints: 5,
    })).toBe('mobile');
  });

  it('detects Android tablets even when their UA omits Mobile', () => {
    expect(resolveDeviceProfile({
      ...desktop,
      userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel Tablet)',
      platform: 'Linux armv8l',
      maxTouchPoints: 10,
      anyPointerFine: false,
      primaryPointerCoarse: true,
      hoverNone: true,
    })).toBe('mobile');
  });

  it('uses capabilities for generic touch-only devices but preserves hybrid desktops', () => {
    const touchDevice = {
      ...desktop,
      platform: 'Win32',
      maxTouchPoints: 10,
      anyPointerFine: false,
      primaryPointerCoarse: true,
      hoverNone: true,
    };
    expect(resolveDeviceProfile(touchDevice)).toBe('mobile');
    expect(resolveDeviceProfile({ ...touchDevice, anyPointerFine: true })).toBe('desktop');
  });
});
