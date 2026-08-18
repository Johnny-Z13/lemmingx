import type { ProductMode } from './productMode';
import type { AdCallbacks, PlatformAdapter, PlatformSystemInfo } from './PlatformTypes';

type CrazySettings = { muteAudio?: boolean; disableChat?: boolean };
type CrazySystemInfo = {
  device?: { type?: 'desktop' | 'tablet' | 'mobile' };
  applicationType?: string;
};

interface CrazySdk {
  init(): Promise<void>;
  environment?: 'local' | 'crazygames' | 'disabled';
  game: {
    gameplayStart(): void;
    gameplayStop(): void;
    settings?: CrazySettings;
    addSettingsChangeListener?(listener: (settings: CrazySettings) => void): void;
    removeSettingsChangeListener?(listener: (settings: CrazySettings) => void): void;
  };
  user?: { systemInfo?: CrazySystemInfo };
  ad?: {
    requestAd(
      kind: 'rewarded' | 'midgame',
      callbacks: { adStarted(): void; adFinished(): void; adError(error: unknown): void },
    ): void;
  };
}

declare global {
  interface Window {
    CrazyGames?: { SDK?: CrazySdk };
  }
}

const SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';

function loadCrazyGamesSdk(): Promise<CrazySdk | null> {
  if (window.CrazyGames?.SDK) return Promise.resolve(window.CrazyGames.SDK);
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    const script = existing ?? document.createElement('script');
    const finish = () => resolve(window.CrazyGames?.SDK ?? null);
    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', () => resolve(null), { once: true });
    if (!existing) {
      script.src = SDK_URL;
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.append(script);
    }
  });
}

export class BrowserPlatformAdapter implements PlatformAdapter {
  readonly adsEnabled: boolean;
  private sdk: CrazySdk | null = null;
  private initialized = false;
  private wantsGameplay = false;
  private reportedGameplay = false;
  private muteListeners = new Set<(muted: boolean) => void>();
  private settingsListener: ((settings: CrazySettings) => void) | null = null;

  constructor(
    readonly mode: ProductMode = 'full',
    private readonly sdkLoader: () => Promise<CrazySdk | null> = loadCrazyGamesSdk,
  ) {
    this.adsEnabled = mode === 'full';
  }

  async init(): Promise<void> {
    if (this.initialized || this.mode !== 'full') return;
    const sdk = await this.sdkLoader();
    if (!sdk) return;
    try {
      await sdk.init();
      if (sdk.environment === 'disabled') return;
      this.sdk = sdk;
      this.initialized = true;
      this.settingsListener = (settings) => this.publishMute(settings.muteAudio === true);
      sdk.game.addSettingsChangeListener?.(this.settingsListener);
      this.publishMute(sdk.game.settings?.muteAudio === true);
      this.flushGameplayState();
    } catch {
      this.sdk = null;
    }
  }

  gameplayStart(): void {
    this.wantsGameplay = true;
    this.flushGameplayState();
  }

  gameplayStop(): void {
    this.wantsGameplay = false;
    this.flushGameplayState();
  }

  onMuteChange(listener: (muted: boolean) => void): () => void {
    this.muteListeners.add(listener);
    if (this.sdk) listener(this.sdk.game.settings?.muteAudio === true);
    return () => this.muteListeners.delete(listener);
  }

  systemInfo(): PlatformSystemInfo {
    const system = this.sdk?.user?.systemInfo;
    return {
      environment: this.sdk?.environment ?? 'unavailable',
      deviceType: system?.device?.type ?? 'unknown',
      applicationType: system?.applicationType ?? null,
    };
  }

  requestAd(kind: 'rewarded' | 'midgame', callbacks: AdCallbacks): boolean {
    if (!this.adsEnabled || !this.sdk?.ad) return false;
    this.sdk.ad.requestAd(kind, {
      adStarted: callbacks.onStarted,
      adFinished: callbacks.onFinished,
      adError: callbacks.onError,
    });
    return true;
  }

  private flushGameplayState(): void {
    if (!this.sdk || this.wantsGameplay === this.reportedGameplay) return;
    if (this.wantsGameplay) this.sdk.game.gameplayStart();
    else this.sdk.game.gameplayStop();
    this.reportedGameplay = this.wantsGameplay;
  }

  private publishMute(muted: boolean): void {
    for (const listener of this.muteListeners) listener(muted);
  }
}
