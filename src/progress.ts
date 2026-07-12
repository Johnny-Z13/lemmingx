/**
 * Campaign progress, persisted as one JSON blob. Storage is injected
 * (localStorage in the game, a fake in tests). Unlock rule: level 0 is always
 * open; every other level opens when its predecessor is completed.
 */

export interface LevelResult {
  completed: boolean;
  bestSavedPct: number;
}

export interface ProgressOptions {
  key?: string;
  /** Temporary playtest override; disable in tests that exercise the real chain. */
  unlockAll?: boolean;
}

/** Flip this off when campaign progression is ready to be player-facing again. */
export const PLAYTEST_UNLOCK_ALL_LEVELS = true;

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export class Progress {
  private results: Record<number, LevelResult>;
  private readonly key: string;
  private readonly unlockAll: boolean;

  constructor(
    private readonly storage: StorageLike,
    options: ProgressOptions = {},
  ) {
    this.key = options.key ?? 'lemmingx.progress.v1';
    this.unlockAll = options.unlockAll ?? PLAYTEST_UNLOCK_ALL_LEVELS;
    this.results = this.load();
  }

  get(index: number): LevelResult {
    const result = this.results[index];
    return result ? { ...result } : { completed: false, bestSavedPct: 0 };
  }

  recordWin(index: number, savedPct: number): void {
    const previous = this.get(index);
    this.results[index] = {
      completed: true,
      bestSavedPct: Math.max(previous.bestSavedPct, Math.round(savedPct)),
    };
    this.save();
  }

  isUnlocked(index: number): boolean {
    if (this.unlockAll) return true;
    if (index <= 0) return true;
    return this.get(index - 1).completed;
  }

  private load(): Record<number, LevelResult> {
    try {
      const raw = this.storage.getItem(this.key);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, Partial<LevelResult>>;
      const results: Record<number, LevelResult> = {};
      for (const [key, value] of Object.entries(parsed)) {
        const index = Number(key);
        if (!Number.isInteger(index) || typeof value !== 'object' || value === null) continue;
        results[index] = {
          completed: value.completed === true,
          bestSavedPct: typeof value.bestSavedPct === 'number' ? value.bestSavedPct : 0,
        };
      }
      return results;
    } catch {
      return {};
    }
  }

  private save(): void {
    try {
      this.storage.setItem(this.key, JSON.stringify(this.results));
    } catch {
      // Storage unavailable — progress just won't survive the session.
    }
  }
}
