export type GraphicsQuality = 'high' | 'low';

export interface UiSettings {
  debugLabels: boolean;
  graphicsQuality: GraphicsQuality;
}

const KEY = 'lemmingx.ui.v1';
const DEFAULTS: UiSettings = { debugLabels: false, graphicsQuality: 'high' };

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function loadUiSettings(storage?: StorageLike): UiSettings {
  try {
    const raw = (storage ?? localStorage).getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<UiSettings>;
    return {
      debugLabels: typeof parsed.debugLabels === 'boolean' ? parsed.debugLabels : DEFAULTS.debugLabels,
      graphicsQuality: parsed.graphicsQuality === 'low' ? 'low' : DEFAULTS.graphicsQuality,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveUiSettings(settings: UiSettings, storage?: StorageLike): void {
  try {
    (storage ?? localStorage).setItem(KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable — keep the setting for this run only.
  }
}
