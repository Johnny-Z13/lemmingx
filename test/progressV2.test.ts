import { describe, expect, it } from 'vitest';
import { Progress, SWARMWRIGHT_SAVE_KEY } from '../src/progress';

class MemoryStorage {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('Swarmwright save v2', () => {
  it('banks newly rescued slots atomically and cannot farm a repeated best', () => {
    const storage = new MemoryStorage();
    const progress = new Progress(storage, { unlockAll: false });

    expect(progress.awardRescue(0, 1).salvageGranted).toBe(1);
    expect(JSON.parse(storage.values.get(SWARMWRIGHT_SAVE_KEY)!).salvage).toBe(1);
    expect(progress.awardRescue(0, 2).salvageGranted).toBe(1);
    expect(progress.awardRescue(0, 2).salvageGranted).toBe(0);

    const refreshed = new Progress(storage, { unlockAll: false });
    expect(refreshed.salvage).toBe(2);
    expect(refreshed.getSite(0).bestSavedCount).toBe(2);
    expect(refreshed.rescuedTotal).toBe(3);
  });

  it('migrates legacy completion without granting unearned currency', () => {
    const storage = new MemoryStorage();
    storage.setItem('lemmingx.progress.v1', JSON.stringify({
      0: { completed: true, bestSavedPct: 80 },
      1: { completed: false, bestSavedPct: 40 },
    }));

    const progress = new Progress(storage, { unlockAll: false });
    expect(progress.status.migratedLegacy).toBe(true);
    expect(progress.get(0)).toEqual({ completed: true, bestSavedPct: 80 });
    expect(progress.currentSite).toBe(1);
    expect(progress.salvage).toBe(0);
    expect(storage.values.has(SWARMWRIGHT_SAVE_KEY)).toBe(true);
  });

  it('persists Atlas bonuses and Workshop purchases without gating campaign access', () => {
    const storage = new MemoryStorage();
    const progress = new Progress(storage, { unlockAll: false });
    for (let rescued = 1; rescued <= 18; rescued += 1) progress.awardRescue(0, rescued);
    expect(progress.discover('wood-floats')).toBe(true);
    expect(progress.discover('wood-floats')).toBe(false);
    expect(progress.purchaseProject('archive-scanner', 20)).toBe(false);
    expect(progress.purchaseProject('signal-lamp', 18)).toBe(true);
    expect(progress.purchaseProject('signal-lamp', 18)).toBe(false);
    expect(progress.hasProject('signal-lamp')).toBe(true);
    expect(progress.isUnlocked(1)).toBe(false);
    expect(progress.grantBonusSalvage(7)).toBe(7);
    expect(new Progress(storage, { unlockAll: false }).salvage).toBe(9);
  });

  it('grants away production once per boot, ignores backwards time, and respects caps', () => {
    const storage = new MemoryStorage();
    const first = new Progress(storage, { unlockAll: false });
    expect(first.applyAwayAccrual(1_000_000).salvageGranted).toBe(0);

    const second = new Progress(storage, { unlockAll: false });
    expect(second.applyAwayAccrual(1_000_000 + 10 * 3_600_000)).toEqual({
      hours: 2,
      salvageGranted: 2,
      capHours: 2,
    });
    expect(second.applyAwayAccrual(1_000_000 + 20 * 3_600_000).salvageGranted).toBe(0);

    const backwards = new Progress(storage, { unlockAll: false });
    expect(backwards.applyAwayAccrual(100).salvageGranted).toBe(0);
  });

  it('uses one forgiving missed-day grace and never repeats a dated reward', () => {
    const progress = new Progress(new MemoryStorage(), { unlockAll: false });
    progress.startDaily('2026-08-18');
    expect(progress.snapshot().daily.activeAttemptDate).toBe('2026-08-18');
    const dayOne = progress.completeDaily('2026-08-18', false, 'A');
    expect(dayOne.salvageGranted).toBe(24);
    expect(progress.snapshot().daily.activeAttemptDate).toBeNull();
    const dayThree = progress.completeDaily('2026-08-20', true, 'B');
    expect(dayThree).toMatchObject({ salvageGranted: 28, currentChain: 2, graceUsed: true });
    expect(progress.completeDaily('2026-08-20', true, 'C').salvageGranted).toBe(0);
    const dayFive = progress.completeDaily('2026-08-22', false, 'D');
    expect(dayFive).toMatchObject({ currentChain: 1, graceUsed: false });
  });

  it('keeps only an improved Daily score: saved, then fewer commands, then time', () => {
    const progress = new Progress(new MemoryStorage(), { unlockAll: false });
    progress.completeDaily('2026-08-18', false, '1-rescue:8.4.500');
    progress.completeDaily('2026-08-18', false, '1-rescue:7.1.100');
    progress.completeDaily('2026-08-18', false, '1-rescue:8.3.700');
    progress.completeDaily('2026-08-18', false, '1-rescue:8.3.600');
    expect(progress.snapshot().daily.bestScoreByDate['2026-08-18']).toBe('1-rescue:8.3.600');
  });

  it('continues safely in memory when storage writes are unavailable', () => {
    const storage = {
      getItem: () => null,
      setItem: () => { throw new Error('blocked'); },
    };
    const progress = new Progress(storage, { unlockAll: false });
    expect(progress.awardRescue(0, 1).salvageGranted).toBe(1);
    expect(progress.salvage).toBe(1);
    expect(progress.status.storageAvailable).toBe(false);
  });
});
