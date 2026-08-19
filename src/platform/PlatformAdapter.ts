import { BrowserPlatformAdapter } from './CrazyGamesPlatformAdapter';
import type { AdCallbacks, PlatformAdapter, PlatformSystemInfo } from './PlatformTypes';

export type { AdCallbacks, PlatformAdapter, PlatformSystemInfo } from './PlatformTypes';

export class NoopPlatformAdapter implements PlatformAdapter {
  readonly adsEnabled = false;

  async init(): Promise<void> {}
  gameplayStart(): void {}
  gameplayStop(): void {}
  onMuteChange(_listener: (muted: boolean) => void): () => void { return () => {}; }
  systemInfo(): PlatformSystemInfo {
    return { environment: 'unavailable', deviceType: 'unknown', applicationType: null };
  }
  requestAd(_kind: 'rewarded' | 'midgame', _callbacks: AdCallbacks): boolean { return false; }
}

export function isEmbeddedBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/** The same artifact runs directly or inside CrazyGames; only the runtime host differs. */
export function createPlatformAdapter(embedded = isEmbeddedBrowser()): PlatformAdapter {
  return embedded ? new BrowserPlatformAdapter() : new NoopPlatformAdapter();
}

export const platform = createPlatformAdapter();
