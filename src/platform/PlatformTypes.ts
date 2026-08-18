import type { ProductMode } from './productMode';

export interface PlatformSystemInfo {
  environment: 'local' | 'crazygames' | 'disabled' | 'unavailable';
  deviceType: 'desktop' | 'tablet' | 'mobile' | 'unknown';
  applicationType: string | null;
}

export interface AdCallbacks {
  onStarted: () => void;
  onFinished: () => void;
  onError: (error: unknown) => void;
}

export interface PlatformAdapter {
  readonly mode: ProductMode;
  readonly adsEnabled: boolean;
  init(): Promise<void>;
  gameplayStart(): void;
  gameplayStop(): void;
  onMuteChange(listener: (muted: boolean) => void): () => void;
  systemInfo(): PlatformSystemInfo;
  requestAd(kind: 'rewarded' | 'midgame', callbacks: AdCallbacks): boolean;
}
