import type { AdCallbacks, PlatformAdapter, PlatformSystemInfo } from './PlatformTypes';

type PokiDevice = { category?: 'desktop' | 'tablet' | 'mobile' };

interface PokiSdk {
  init(): Promise<void>;
  gameLoadingFinished(): void;
  gameplayStart(): void;
  gameplayStop(): void;
  commercialBreak(onStart?: () => void): Promise<void>;
  rewardedBreak(options?: { size?: 'small' | 'medium' | 'large'; onStart?: () => void }): Promise<boolean>;
  happyTime?(intensity: number): void;
  getDeviceInfo?(): PokiDevice;
}

declare global {
  interface Window {
    PokiSDK?: PokiSdk;
  }
}

const SDK_URL = 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js';

function loadPokiSdk(): Promise<PokiSdk | null> {
  if (window.PokiSDK) return Promise.resolve(window.PokiSDK);
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    const script = existing ?? document.createElement('script');
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(window.PokiSDK ?? null);
    };
    const timeout = window.setTimeout(finish, 8_000);
    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', finish, { once: true });
    if (!existing) {
      script.src = SDK_URL;
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.append(script);
    }
  });
}

export class PokiPlatformAdapter implements PlatformAdapter {
  private sdk: PokiSdk | null = null;
  private initialized = false;
  private wantsLoadingComplete = false;
  private reportedLoadingComplete = false;
  private hasUserInteraction = false;
  private wantsGameplay = false;
  private reportedGameplay = false;

  constructor(private readonly sdkLoader: () => Promise<PokiSdk | null> = loadPokiSdk) {}

  get adsEnabled(): boolean {
    return this.initialized && !!this.sdk?.commercialBreak && !!this.sdk?.rewardedBreak;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    const sdk = await this.sdkLoader();
    if (!sdk) return;
    try {
      await sdk.init();
      this.sdk = sdk;
      this.initialized = true;
      this.flushLoadingState();
      this.flushGameplayState();
    } catch {
      this.sdk = null;
    }
  }

  loadingComplete(): void {
    this.wantsLoadingComplete = true;
    this.flushLoadingState();
    this.flushGameplayState();
  }

  userInteracted(): void {
    this.hasUserInteraction = true;
    this.flushGameplayState();
  }

  gameplayStart(): void {
    this.wantsGameplay = true;
    this.flushGameplayState();
  }

  gameplayStop(): void {
    this.wantsGameplay = false;
    this.flushGameplayState();
  }

  reportProgress(_percent: number): void {}

  celebrate(intensity = 1): void {
    this.sdk?.happyTime?.(Math.max(0, Math.min(1, intensity)));
  }

  onMuteChange(_listener: (muted: boolean) => void): () => void {
    return () => {};
  }

  systemInfo(): PlatformSystemInfo {
    return {
      environment: this.initialized ? 'poki' : 'unavailable',
      deviceType: this.sdk?.getDeviceInfo?.().category ?? 'unknown',
      applicationType: this.initialized ? 'poki-web' : null,
    };
  }

  requestAd(kind: 'rewarded' | 'midgame', callbacks: AdCallbacks): boolean {
    if (!this.adsEnabled || !this.sdk) return false;
    try {
      if (kind === 'midgame') {
        void this.sdk.commercialBreak(callbacks.onStarted).then(
          callbacks.onFinished,
          callbacks.onError,
        );
      } else {
        void this.sdk.rewardedBreak({ size: 'medium', onStart: callbacks.onStarted }).then(
          (rewarded) => {
            if (rewarded) callbacks.onFinished();
            else callbacks.onError(new Error('poki-reward-not-granted'));
          },
          callbacks.onError,
        );
      }
      return true;
    } catch (error) {
      callbacks.onError(error);
      return true;
    }
  }

  private flushLoadingState(): void {
    if (!this.sdk || !this.wantsLoadingComplete || this.reportedLoadingComplete) return;
    this.sdk.gameLoadingFinished();
    this.reportedLoadingComplete = true;
  }

  private flushGameplayState(): void {
    if (
      !this.sdk
      || !this.reportedLoadingComplete
      || (this.wantsGameplay && !this.hasUserInteraction)
      || this.wantsGameplay === this.reportedGameplay
    ) return;
    if (this.wantsGameplay) this.sdk.gameplayStart();
    else this.sdk.gameplayStop();
    this.reportedGameplay = this.wantsGameplay;
  }
}
