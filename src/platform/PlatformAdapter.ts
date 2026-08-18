import { PRODUCT_MODE, type ProductMode } from './productMode';
import type { AdCallbacks, PlatformAdapter, PlatformSystemInfo } from './PlatformTypes';

export type { AdCallbacks, PlatformAdapter, PlatformSystemInfo } from './PlatformTypes';

export class NoopPlatformAdapter implements PlatformAdapter {
  readonly adsEnabled = false;

  constructor(readonly mode: ProductMode = PRODUCT_MODE) {}

  async init(): Promise<void> {}
  gameplayStart(): void {}
  gameplayStop(): void {}
  onMuteChange(_listener: (muted: boolean) => void): () => void { return () => {}; }
  systemInfo(): PlatformSystemInfo {
    return { environment: 'unavailable', deviceType: 'unknown', applicationType: null };
  }
  requestAd(_kind: 'rewarded' | 'midgame', _callbacks: AdCallbacks): boolean { return false; }
}

export const platform = new NoopPlatformAdapter();
