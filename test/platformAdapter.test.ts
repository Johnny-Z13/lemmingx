import { describe, expect, it, vi } from 'vitest';
import { CrazyGamesPlatformAdapter } from '../src/platform/CrazyGamesPlatformAdapter';
import { PokiPlatformAdapter } from '../src/platform/PokiPlatformAdapter';
import {
  createPlatformAdapter,
  NoopPlatformAdapter,
  resolvePlatformHost,
} from '../src/platform/PlatformAdapter';

describe('BrowserPlatformAdapter', () => {
  it('keeps direct launches ad-free and safe without an SDK', async () => {
    const adapter = new NoopPlatformAdapter();
    await adapter.init();
    adapter.loadingComplete();
    adapter.userInteracted();
    adapter.gameplayStart();
    adapter.gameplayStop();
    adapter.reportProgress(50);
    adapter.celebrate();
    const callbacks = { onStarted: vi.fn(), onFinished: vi.fn(), onError: vi.fn() };

    expect(adapter.adsEnabled).toBe(false);
    expect(adapter.requestAd('rewarded', callbacks)).toBe(false);
    expect(adapter.systemInfo()).toEqual({
      environment: 'unavailable',
      deviceType: 'unknown',
      applicationType: null,
    });
    expect(callbacks.onStarted).not.toHaveBeenCalled();
  });

  it('queues lifecycle until embedded SDK init and forwards mute, system, and ad callbacks', async () => {
    let settingsListener: ((settings: { muteAudio?: boolean }) => void) | undefined;
    const gameplayStart = vi.fn();
    const gameplayStop = vi.fn();
    const loadingStart = vi.fn();
    const loadingStop = vi.fn();
    const reportGameCompletedPercentage = vi.fn();
    const happytime = vi.fn();
    const requestAd = vi.fn((
      _kind: 'rewarded' | 'midgame',
      callbacks: { adStarted: () => void; adFinished: () => void; adError: (error: unknown) => void },
    ) => callbacks.adStarted());
    const sdk = {
      init: vi.fn(async () => {}),
      environment: 'crazygames' as const,
      game: {
        gameplayStart,
        gameplayStop,
        loadingStart,
        loadingStop,
        reportGameCompletedPercentage,
        happytime,
        settings: { muteAudio: false },
        addSettingsChangeListener: vi.fn((listener) => { settingsListener = listener; }),
      },
      user: { systemInfo: { device: { type: 'mobile' as const }, applicationType: 'crazygames-app' } },
      ad: { requestAd },
    };
    const adapter = new CrazyGamesPlatformAdapter(async () => sdk);
    const mute = vi.fn();
    adapter.onMuteChange(mute);
    adapter.gameplayStart();
    expect(gameplayStart).not.toHaveBeenCalled();

    await adapter.init();
    expect(loadingStart).toHaveBeenCalledOnce();
    expect(gameplayStart).not.toHaveBeenCalled();
    adapter.reportProgress(31.6);
    adapter.loadingComplete();
    expect(loadingStop).toHaveBeenCalledOnce();
    expect(gameplayStart).toHaveBeenCalledOnce();
    expect(reportGameCompletedPercentage).toHaveBeenCalledWith(32);
    expect(mute).toHaveBeenCalledWith(false);
    expect(adapter.systemInfo()).toEqual({
      environment: 'crazygames',
      deviceType: 'mobile',
      applicationType: 'crazygames-app',
    });
    settingsListener?.({ muteAudio: true });
    expect(mute).toHaveBeenLastCalledWith(true);

    const callbacks = { onStarted: vi.fn(), onFinished: vi.fn(), onError: vi.fn() };
    expect(adapter.requestAd('rewarded', callbacks)).toBe(true);
    expect(requestAd).toHaveBeenCalledOnce();
    expect(callbacks.onStarted).toHaveBeenCalledOnce();
    adapter.gameplayStop();
    expect(gameplayStop).toHaveBeenCalledOnce();
    adapter.celebrate();
    expect(happytime).toHaveBeenCalledOnce();
  });

  it('defers Poki gameplay until loading and the first player interaction', async () => {
    const gameLoadingFinished = vi.fn();
    const gameplayStart = vi.fn();
    const gameplayStop = vi.fn();
    const commercialBreak = vi.fn(async (onStart?: () => void) => onStart?.());
    const rewardedBreak = vi.fn(async (options?: { onStart?: () => void }) => {
      options?.onStart?.();
      return true;
    });
    const happyTime = vi.fn();
    const sdk = {
      init: vi.fn(async () => {}),
      gameLoadingFinished,
      gameplayStart,
      gameplayStop,
      commercialBreak,
      rewardedBreak,
      happyTime,
      getDeviceInfo: () => ({ category: 'tablet' as const }),
    };
    const adapter = new PokiPlatformAdapter(async () => sdk);

    adapter.gameplayStart();
    adapter.loadingComplete();
    await adapter.init();
    expect(gameLoadingFinished).toHaveBeenCalledOnce();
    expect(gameplayStart).not.toHaveBeenCalled();

    adapter.userInteracted();
    expect(gameplayStart).toHaveBeenCalledOnce();
    expect(adapter.systemInfo()).toEqual({
      environment: 'poki',
      deviceType: 'tablet',
      applicationType: 'poki-web',
    });

    const callbacks = { onStarted: vi.fn(), onFinished: vi.fn(), onError: vi.fn() };
    expect(adapter.requestAd('rewarded', callbacks)).toBe(true);
    await vi.waitFor(() => expect(callbacks.onFinished).toHaveBeenCalledOnce());
    expect(callbacks.onStarted).toHaveBeenCalledOnce();
    expect(callbacks.onError).not.toHaveBeenCalled();

    adapter.gameplayStop();
    expect(gameplayStop).toHaveBeenCalledOnce();
    adapter.celebrate(2);
    expect(happyTime).toHaveBeenCalledWith(1);
  });

  it('selects direct, Poki, and CrazyGames adapters without separate builds', () => {
    expect(createPlatformAdapter('direct')).toBeInstanceOf(NoopPlatformAdapter);
    expect(createPlatformAdapter('poki')).toBeInstanceOf(PokiPlatformAdapter);
    expect(createPlatformAdapter('crazygames')).toBeInstanceOf(CrazyGamesPlatformAdapter);
  });

  it('resolves known portal origins and fails unknown embeds closed', () => {
    const base = {
      embedded: true,
      locationHref: 'https://portal-candidate.invalid/game/',
      locationSearch: '',
      referrer: '',
      ancestorOrigins: [] as string[],
      hasPokiSdk: false,
      hasCrazyGamesSdk: false,
    };
    expect(resolvePlatformHost({ ...base, referrer: 'https://poki.com/en/g/swarmwright' })).toBe('poki');
    expect(resolvePlatformHost({ ...base, locationHref: 'https://swarmwright.game-files.crazygames.com/v1/' })).toBe('crazygames');
    expect(resolvePlatformHost({ ...base, ancestorOrigins: ['https://www.crazygames.com.br'] })).toBe('crazygames');
    expect(resolvePlatformHost({ ...base, ancestorOrigins: ['https://www.crazygames.com'] })).toBe('crazygames');
    expect(resolvePlatformHost({ ...base, locationSearch: '?portal=poki' })).toBe('poki');
    expect(resolvePlatformHost(base)).toBe('direct');
  });
});
