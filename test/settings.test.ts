import { describe, expect, it } from 'vitest';
import { loadUiSettings, saveUiSettings } from '../src/ui/settings';

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

describe('UI settings', () => {
  it('defaults graphics to high', () => {
    expect(loadUiSettings(fakeStorage())).toEqual({
      debugLabels: false,
      graphicsQuality: 'high',
    });
  });

  it('persists low graphics alongside the existing label preference', () => {
    const storage = fakeStorage();
    saveUiSettings({ debugLabels: true, graphicsQuality: 'low' }, storage);

    expect(loadUiSettings(storage)).toEqual({
      debugLabels: true,
      graphicsQuality: 'low',
    });
  });

  it('repairs invalid or legacy graphics values to high', () => {
    const storage = fakeStorage({
      'lemmingx.ui.v1': JSON.stringify({ debugLabels: true, graphicsQuality: 'ultra' }),
    });

    expect(loadUiSettings(storage)).toEqual({
      debugLabels: true,
      graphicsQuality: 'high',
    });
  });
});
