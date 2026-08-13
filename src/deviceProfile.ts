export type DeviceProfile = 'desktop' | 'mobile';

export interface DeviceProfileInput {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  mobileClientHint: boolean;
  anyPointerFine: boolean;
  primaryPointerCoarse: boolean;
  hoverNone: boolean;
}

/**
 * Selects the presentation/input profile from device capabilities. User-agent
 * checks are limited to established mobile platforms and iPadOS's desktop-UA
 * compatibility mode; viewport dimensions never decide whether a device is mobile.
 */
export function resolveDeviceProfile(input: DeviceProfileInput): DeviceProfile {
  const appleMobile = /iPad|iPhone|iPod/i.test(input.userAgent);
  const ipadDesktopUa = input.platform === 'MacIntel' && input.maxTouchPoints > 1;
  const establishedMobilePlatform = appleMobile || /Android|Mobile/i.test(input.userAgent);
  if (input.mobileClientHint || ipadDesktopUa || establishedMobilePlatform) return 'mobile';

  const touchOnly = input.maxTouchPoints > 0
    && !input.anyPointerFine
    && (input.primaryPointerCoarse || input.hoverNone);
  return touchOnly ? 'mobile' : 'desktop';
}

function readDeviceProfile(): DeviceProfile {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'desktop';
  const clientHints = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  return resolveDeviceProfile({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    mobileClientHint: clientHints.userAgentData?.mobile === true,
    anyPointerFine: window.matchMedia('(any-pointer: fine)').matches,
    primaryPointerCoarse: window.matchMedia('(pointer: coarse)').matches,
    hoverNone: window.matchMedia('(hover: none)').matches,
  });
}

export const DEVICE_PROFILE = readDeviceProfile();
export const IS_MOBILE_DEVICE = DEVICE_PROFILE === 'mobile';
