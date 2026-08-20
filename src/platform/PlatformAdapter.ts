import { CrazyGamesPlatformAdapter } from './CrazyGamesPlatformAdapter';
import { PokiPlatformAdapter } from './PokiPlatformAdapter';
import type { AdCallbacks, PlatformAdapter, PlatformSystemInfo } from './PlatformTypes';

export type { AdCallbacks, PlatformAdapter, PlatformSystemInfo } from './PlatformTypes';

export class NoopPlatformAdapter implements PlatformAdapter {
  readonly adsEnabled = false;

  async init(): Promise<void> {}
  loadingComplete(): void {}
  userInteracted(): void {}
  gameplayStart(): void {}
  gameplayStop(): void {}
  reportProgress(_percent: number): void {}
  celebrate(_intensity = 1): void {}
  onMuteChange(_listener: (muted: boolean) => void): () => void { return () => {}; }
  systemInfo(): PlatformSystemInfo {
    return { environment: 'unavailable', deviceType: 'unknown', applicationType: null };
  }
  requestAd(_kind: 'rewarded' | 'midgame', _callbacks: AdCallbacks): boolean { return false; }
}

export type PlatformHost = 'direct' | 'poki' | 'crazygames';

export interface PlatformHostSignals {
  embedded: boolean;
  locationHref: string;
  locationSearch: string;
  referrer: string;
  ancestorOrigins: readonly string[];
  hasPokiSdk: boolean;
  hasCrazyGamesSdk: boolean;
}

function matchesHost(value: string, rootDomain: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === rootDomain || hostname.endsWith(`.${rootDomain}`);
  } catch {
    return false;
  }
}

function matchesCrazyGamesHost(value: string): boolean {
  try {
    const parts = new URL(value).hostname.toLowerCase().split('.');
    const index = parts.indexOf('crazygames');
    return index !== -1 && index >= parts.length - 3;
  } catch {
    return false;
  }
}

export function resolvePlatformHost(signals: PlatformHostSignals): PlatformHost {
  const requested = new URLSearchParams(signals.locationSearch).get('portal');
  if (requested === 'poki' || requested === 'crazygames') return requested;
  if (signals.hasPokiSdk) return 'poki';
  if (signals.hasCrazyGamesSdk) return 'crazygames';
  if (!signals.embedded) return 'direct';
  const origins = [signals.locationHref, signals.referrer, ...signals.ancestorOrigins];
  if (origins.some((origin) => matchesHost(origin, 'poki.com') || matchesHost(origin, 'poki.dev'))) return 'poki';
  if (origins.some(matchesCrazyGamesHost)) return 'crazygames';
  return 'direct';
}

export function isEmbeddedBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function detectPlatformHost(): PlatformHost {
  if (typeof window === 'undefined') return 'direct';
  let ancestorOrigins: string[] = [];
  try {
    ancestorOrigins = Array.from(window.location.ancestorOrigins ?? []);
  } catch {
    ancestorOrigins = [];
  }
  return resolvePlatformHost({
    embedded: isEmbeddedBrowser(),
    locationHref: window.location.href,
    locationSearch: window.location.search,
    referrer: document.referrer,
    ancestorOrigins,
    hasPokiSdk: !!window.PokiSDK,
    hasCrazyGamesSdk: !!window.CrazyGames?.SDK,
  });
}

/** One artifact runs directly, on Vercel, Poki, or CrazyGames; only the host adapter differs. */
export function createPlatformAdapter(host: PlatformHost = detectPlatformHost()): PlatformAdapter {
  if (host === 'poki') return new PokiPlatformAdapter();
  if (host === 'crazygames') return new CrazyGamesPlatformAdapter();
  return new NoopPlatformAdapter();
}

export const platform = createPlatformAdapter();
