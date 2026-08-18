import { describe, expect, it, vi } from 'vitest';
import { BrowserPlatformAdapter } from '../src/platform/CrazyGamesPlatformAdapter';
import { NoopPlatformAdapter } from '../src/platform/PlatformAdapter';

describe('BrowserPlatformAdapter', () => {
  it('keeps Basic Launch ad-free and safe without an SDK', async () => {
    const adapter = new NoopPlatformAdapter('basic');
    await adapter.init();
    adapter.gameplayStart();
    adapter.gameplayStop();
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

  it('queues lifecycle until Full Launch SDK init and forwards mute, system, and ad callbacks', async () => {
    let settingsListener: ((settings: { muteAudio?: boolean }) => void) | undefined;
    const gameplayStart = vi.fn();
    const gameplayStop = vi.fn();
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
        settings: { muteAudio: false },
        addSettingsChangeListener: vi.fn((listener) => { settingsListener = listener; }),
      },
      user: { systemInfo: { device: { type: 'mobile' as const }, applicationType: 'crazygames-app' } },
      ad: { requestAd },
    };
    const adapter = new BrowserPlatformAdapter('full', async () => sdk);
    const mute = vi.fn();
    adapter.onMuteChange(mute);
    adapter.gameplayStart();
    expect(gameplayStart).not.toHaveBeenCalled();

    await adapter.init();
    expect(gameplayStart).toHaveBeenCalledOnce();
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
  });
});
