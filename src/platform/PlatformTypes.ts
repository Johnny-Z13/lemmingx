export interface PlatformSystemInfo {
  environment: 'local' | 'poki' | 'crazygames' | 'disabled' | 'unavailable';
  deviceType: 'desktop' | 'tablet' | 'mobile' | 'unknown';
  applicationType: string | null;
}

export interface AdCallbacks {
  onStarted: () => void;
  onFinished: () => void;
  onError: (error: unknown) => void;
}

export interface PlatformAdapter {
  readonly adsEnabled: boolean;
  init(): Promise<void>;
  loadingComplete(): void;
  userInteracted(): void;
  gameplayStart(): void;
  gameplayStop(): void;
  reportProgress(percent: number): void;
  celebrate(intensity?: number): void;
  onMuteChange(listener: (muted: boolean) => void): () => void;
  systemInfo(): PlatformSystemInfo;
  requestAd(kind: 'rewarded' | 'midgame', callbacks: AdCallbacks): boolean;
}
