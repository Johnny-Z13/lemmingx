/** Persisted audio preferences (music/SFX mute + volume), survives reloads. */

export interface AudioSettings {
  musicMuted: boolean;
  musicVolume: number; // 0..1
  sfxMuted: boolean;
  sfxVolume: number; // 0..1
}

const KEY = 'lemmingx.audio.v1';

const DEFAULTS: AudioSettings = {
  musicMuted: true,
  musicVolume: 0.5,
  sfxMuted: false,
  sfxVolume: 0.5,
};

export function loadAudioSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<AudioSettings>;
    return {
      musicMuted: typeof parsed.musicMuted === 'boolean' ? parsed.musicMuted : DEFAULTS.musicMuted,
      musicVolume: clamp01(parsed.musicVolume, DEFAULTS.musicVolume),
      sfxMuted: typeof parsed.sfxMuted === 'boolean' ? parsed.sfxMuted : DEFAULTS.sfxMuted,
      sfxVolume: clamp01(parsed.sfxVolume, DEFAULTS.sfxVolume),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveAudioSettings(settings: AudioSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable (private mode etc.) — settings just won't persist.
  }
}

function clamp01(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}
