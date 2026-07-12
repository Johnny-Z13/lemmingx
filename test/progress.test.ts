import { describe, expect, it } from 'vitest';
import { PLAYTEST_UNLOCK_ALL_LEVELS, Progress } from '../src/progress';

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

describe('Progress', () => {
  it('unlocks the full campaign in the current playtest build', () => {
    expect(PLAYTEST_UNLOCK_ALL_LEVELS).toBe(true);
    const progress = new Progress(fakeStorage());
    for (let index = 0; index < 10; index += 1) {
      expect(progress.isUnlocked(index)).toBe(true);
    }
  });

  it('defaults to nothing completed, only level 0 unlocked', () => {
    const progress = new Progress(fakeStorage(), { unlockAll: false });
    expect(progress.get(0)).toEqual({ completed: false, bestSavedPct: 0 });
    expect(progress.isUnlocked(0)).toBe(true);
    expect(progress.isUnlocked(1)).toBe(false);
  });

  it('recordWin completes the level, keeps the best percentage, unlocks the next', () => {
    const progress = new Progress(fakeStorage(), { unlockAll: false });
    progress.recordWin(0, 70);
    expect(progress.get(0)).toEqual({ completed: true, bestSavedPct: 70 });
    expect(progress.isUnlocked(1)).toBe(true);

    progress.recordWin(0, 50);
    expect(progress.get(0).bestSavedPct).toBe(70); // lower run doesn't regress

    progress.recordWin(0, 90);
    expect(progress.get(0).bestSavedPct).toBe(90);
  });

  it('persists through the injected storage', () => {
    const storage = fakeStorage();
    new Progress(storage, { unlockAll: false }).recordWin(2, 100);
    const reloaded = new Progress(storage, { unlockAll: false });
    expect(reloaded.get(2)).toEqual({ completed: true, bestSavedPct: 100 });
    expect(reloaded.isUnlocked(3)).toBe(true);
  });

  it('falls back to empty progress on corrupted data', () => {
    const storage = fakeStorage({ 'lemmingx.progress.v1': '{not json' });
    const progress = new Progress(storage, { unlockAll: false });
    expect(progress.get(0)).toEqual({ completed: false, bestSavedPct: 0 });
    expect(progress.isUnlocked(0)).toBe(true);
  });
});
