export interface UiSettings {
  debugLabels: boolean;
}

const KEY = 'lemmingx.ui.v1';
const DEFAULTS: UiSettings = { debugLabels: false };

export function loadUiSettings(): UiSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<UiSettings>;
    return {
      debugLabels: typeof parsed.debugLabels === 'boolean' ? parsed.debugLabels : DEFAULTS.debugLabels,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveUiSettings(settings: UiSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable — keep the setting for this run only.
  }
}
