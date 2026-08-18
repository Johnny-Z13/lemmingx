import { DEV_SANDBOX_ENABLED } from './runtimeMode';

export interface LevelResult {
  completed: boolean;
  bestSavedPct: number;
}

export interface SiteProgress extends LevelResult {
  bestSavedCount: number;
  failures: number;
}

export type WorkshopProjectId =
  | 'signal-lamp'
  | 'crew-quarters'
  | 'archive-scanner'
  | 'salvage-crane'
  | 'paint-locker'
  | 'yard-gantry';

export interface DailyProgress {
  activeAttemptDate: string | null;
  lastCompletedDate: string | null;
  currentChain: number;
  bestChain: number;
  graceAvailable: boolean;
  totalCompletions: number;
  rewardsByDate: Record<string, number>;
  bestScoreByDate: Record<string, string>;
}

export interface SwarmwrightSaveV2 {
  version: 2;
  started: boolean;
  currentSite: number;
  salvage: number;
  rescuedTotal: number;
  sites: Record<number, SiteProgress>;
  atlas: string[];
  workshop: WorkshopProjectId[];
  daily: DailyProgress;
  lastSeenUtcMs: number | null;
}

export interface ProgressOptions {
  key?: string;
  legacyKey?: string;
  /** Sandbox-only roster override; tests pass this explicitly. */
  unlockAll?: boolean;
}

export interface RescueGrant {
  salvageGranted: number;
  newBestSavedCount: number;
}

export interface AwayGrant {
  hours: number;
  salvageGranted: number;
  capHours: number;
}

export interface DailyGrant {
  firstCompletion: boolean;
  salvageGranted: number;
  currentChain: number;
  bestChain: number;
  graceUsed: boolean;
}

export const SWARMWRIGHT_SAVE_KEY = 'swarmwright.save.v2';
const LEGACY_PROGRESS_KEY = 'lemmingx.progress.v1';

/** Sandbox keeps the roster open; the canonical player experience uses completion. */
export const PLAYTEST_UNLOCK_ALL_LEVELS = DEV_SANDBOX_ENABLED;

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function safeBrowserStorage(): StorageLike {
  try {
    return window.localStorage;
  } catch {
    return {
      getItem: () => null,
      setItem: () => { throw new Error('storage-unavailable'); },
    };
  }
}

function emptyDaily(): DailyProgress {
  return {
    activeAttemptDate: null,
    lastCompletedDate: null,
    currentChain: 0,
    bestChain: 0,
    graceAvailable: true,
    totalCompletions: 0,
    rewardsByDate: {},
    bestScoreByDate: {},
  };
}

function emptySave(): SwarmwrightSaveV2 {
  return {
    version: 2,
    started: false,
    currentSite: 0,
    salvage: 0,
    rescuedTotal: 0,
    sites: {},
    atlas: [],
    workshop: [],
    daily: emptyDaily(),
    lastSeenUtcMs: null,
  };
}

function asNonNegativeInteger(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : fallback;
}

function utcDayNumber(date: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const time = Date.parse(`${date}T00:00:00.000Z`);
  return Number.isFinite(time) ? Math.floor(time / 86_400_000) : null;
}

function dailyScoreParts(code: string): [number, number, number] | null {
  const match = code.match(/:(\d+)\.(\d+)\.(\d+)$/);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

function isBetterDailyScore(next: string, previous: string | undefined): boolean {
  if (!previous) return true;
  const a = dailyScoreParts(next);
  const b = dailyScoreParts(previous);
  if (!a || !b) return false;
  if (a[0] !== b[0]) return a[0] > b[0];
  if (a[1] !== b[1]) return a[1] < b[1];
  return a[2] < b[2];
}

/**
 * Versioned, continuously written player progress. The class retains the old
 * campaign API so scene code and tests can migrate without a second source of
 * truth. All writes replace one JSON snapshot; storage failure only disables
 * persistence for the current session.
 */
export class Progress {
  private data: SwarmwrightSaveV2;
  private readonly key: string;
  private readonly legacyKey: string;
  private readonly unlockAll: boolean;
  private awayApplied = false;
  private storageAvailable = true;
  private migratedLegacy = false;
  private recoveredCorrupt = false;

  constructor(
    private readonly storage: StorageLike,
    options: ProgressOptions = {},
  ) {
    this.key = options.key ?? SWARMWRIGHT_SAVE_KEY;
    this.legacyKey = options.legacyKey ?? LEGACY_PROGRESS_KEY;
    this.unlockAll = options.unlockAll ?? PLAYTEST_UNLOCK_ALL_LEVELS;
    this.data = this.load();
  }

  snapshot(): SwarmwrightSaveV2 {
    return structuredClone(this.data);
  }

  get status(): { storageAvailable: boolean; migratedLegacy: boolean; recoveredCorrupt: boolean } {
    return {
      storageAvailable: this.storageAvailable,
      migratedLegacy: this.migratedLegacy,
      recoveredCorrupt: this.recoveredCorrupt,
    };
  }

  get salvage(): number {
    return this.data.salvage;
  }

  get rescuedTotal(): number {
    return this.data.rescuedTotal;
  }

  get atlasCount(): number {
    return this.data.atlas.length;
  }

  grantBonusSalvage(amount: number): number {
    const granted = Math.max(0, Math.floor(amount));
    if (granted === 0) return 0;
    this.data.salvage += granted;
    this.data.started = true;
    this.save();
    return granted;
  }

  get currentSite(): number {
    return this.data.currentSite;
  }

  get(index: number): LevelResult {
    const result = this.data.sites[index];
    return result
      ? { completed: result.completed, bestSavedPct: result.bestSavedPct }
      : { completed: false, bestSavedPct: 0 };
  }

  getSite(index: number): SiteProgress {
    const result = this.data.sites[index];
    return result
      ? { ...result }
      : { completed: false, bestSavedPct: 0, bestSavedCount: 0, failures: 0 };
  }

  hasProgress(): boolean {
    return this.data.started || this.data.salvage > 0 || Object.keys(this.data.sites).length > 0;
  }

  markStarted(): void {
    if (this.data.started) return;
    this.data.started = true;
    this.save();
  }

  setCurrentSite(index: number): void {
    const next = Math.max(0, Math.floor(index));
    if (this.data.currentSite === next) return;
    this.data.currentSite = next;
    this.save();
  }

  /** Bank every rescue immediately; only newly improved slots grant Salvage. */
  awardRescue(index: number, savedCount: number): RescueGrant {
    const site = this.ensureSite(index);
    const nextSaved = Math.max(0, Math.floor(savedCount));
    const salvageGranted = Math.max(0, nextSaved - site.bestSavedCount);
    site.bestSavedCount = Math.max(site.bestSavedCount, nextSaved);
    this.data.rescuedTotal += 1;
    this.data.salvage += salvageGranted;
    this.data.started = true;
    this.data.currentSite = Math.max(0, index);
    this.save();
    return { salvageGranted, newBestSavedCount: site.bestSavedCount };
  }

  discover(id: string): boolean {
    if (!id || this.data.atlas.includes(id)) return false;
    this.data.atlas.push(id);
    this.data.salvage += 2;
    this.data.started = true;
    this.save();
    return true;
  }

  hasDiscovery(id: string): boolean {
    return this.data.atlas.includes(id);
  }

  recordWin(index: number, savedPct: number): void {
    const site = this.ensureSite(index);
    site.completed = true;
    site.bestSavedPct = Math.max(site.bestSavedPct, Math.round(savedPct));
    this.data.currentSite = Math.max(this.data.currentSite, index + 1);
    this.data.started = true;
    this.save();
  }

  recordFailure(index: number): number {
    const site = this.ensureSite(index);
    site.failures += 1;
    this.data.started = true;
    this.data.currentSite = index;
    this.save();
    return site.failures;
  }

  purchaseProject(id: WorkshopProjectId, cost: number): boolean {
    const price = Math.max(0, Math.floor(cost));
    const tier = id === 'signal-lamp' || id === 'crew-quarters'
      ? 1
      : id === 'archive-scanner' || id === 'salvage-crane'
        ? 2
        : 3;
    const available = tier === 1 || (tier === 2 ? this.data.workshop.length >= 1 : this.data.workshop.length >= 3);
    if (!available || this.data.workshop.includes(id) || this.data.salvage < price) return false;
    this.data.salvage -= price;
    this.data.workshop.push(id);
    this.save();
    return true;
  }

  hasProject(id: WorkshopProjectId): boolean {
    return this.data.workshop.includes(id);
  }

  awayCapHours(): number {
    if (this.hasProject('yard-gantry')) return 4;
    if (this.hasProject('salvage-crane')) return 3;
    return 2;
  }

  /** Apply one clamped away grant per Progress instance (one boot/session epoch). */
  applyAwayAccrual(nowUtcMs: number): AwayGrant {
    const capHours = this.awayCapHours();
    if (this.awayApplied) return { hours: 0, salvageGranted: 0, capHours };
    this.awayApplied = true;
    const now = Math.max(0, Math.floor(nowUtcMs));
    const previous = this.data.lastSeenUtcMs;
    this.data.lastSeenUtcMs = now;
    if (previous === null || now <= previous) {
      this.save();
      return { hours: 0, salvageGranted: 0, capHours };
    }
    const hours = Math.min(capHours, Math.floor((now - previous) / 3_600_000));
    this.data.salvage += hours;
    this.save();
    return { hours, salvageGranted: hours, capHours };
  }

  completeDaily(date: string, mastery: boolean, scoreCode: string): DailyGrant {
    const day = utcDayNumber(date);
    if (day === null) throw new Error(`Invalid UTC daily date: ${date}`);
    const daily = this.data.daily;
    if (daily.activeAttemptDate === date) daily.activeAttemptDate = null;
    if (isBetterDailyScore(scoreCode, daily.bestScoreByDate[date])) {
      daily.bestScoreByDate[date] = scoreCode;
    }
    if (daily.rewardsByDate[date] !== undefined) {
      this.save();
      return {
        firstCompletion: false,
        salvageGranted: 0,
        currentChain: daily.currentChain,
        bestChain: daily.bestChain,
        graceUsed: false,
      };
    }

    let graceUsed = false;
    const previousDay = daily.lastCompletedDate ? utcDayNumber(daily.lastCompletedDate) : null;
    if (previousDay === null) {
      daily.currentChain = 1;
    } else {
      const gap = day - previousDay;
      if (gap === 1) daily.currentChain += 1;
      else if (gap === 2 && daily.graceAvailable) {
        daily.currentChain += 1;
        daily.graceAvailable = false;
        graceUsed = true;
      } else if (gap > 0) {
        daily.currentChain = 1;
        daily.graceAvailable = true;
      }
    }

    const salvageGranted = 24 + (mastery ? 4 : 0);
    daily.rewardsByDate[date] = salvageGranted;
    daily.lastCompletedDate = date;
    daily.totalCompletions += 1;
    daily.bestChain = Math.max(daily.bestChain, daily.currentChain);
    this.data.salvage += salvageGranted;
    this.data.started = true;
    this.save();
    return {
      firstCompletion: true,
      salvageGranted,
      currentChain: daily.currentChain,
      bestChain: daily.bestChain,
      graceUsed,
    };
  }

  startDaily(date: string): void {
    if (utcDayNumber(date) === null) throw new Error(`Invalid UTC daily date: ${date}`);
    this.data.daily.activeAttemptDate = date;
    this.data.started = true;
    this.save();
  }

  isUnlocked(index: number): boolean {
    if (this.unlockAll) return true;
    if (index <= 0) return true;
    return this.get(index - 1).completed;
  }

  reset(): void {
    this.data = emptySave();
    this.awayApplied = false;
    this.save();
  }

  private ensureSite(index: number): SiteProgress {
    const safeIndex = Math.max(0, Math.floor(index));
    const existing = this.data.sites[safeIndex];
    if (existing) return existing;
    const site: SiteProgress = { completed: false, bestSavedPct: 0, bestSavedCount: 0, failures: 0 };
    this.data.sites[safeIndex] = site;
    return site;
  }

  private load(): SwarmwrightSaveV2 {
    try {
      const raw = this.storage.getItem(this.key);
      if (raw) return this.normalize(JSON.parse(raw));
      const migrated = this.migrateLegacy();
      if (migrated) {
        this.migratedLegacy = true;
        this.data = migrated;
        this.save();
        return migrated;
      }
      return emptySave();
    } catch {
      this.storageAvailable = false;
      this.recoveredCorrupt = true;
      return emptySave();
    }
  }

  private migrateLegacy(): SwarmwrightSaveV2 | null {
    const raw = this.storage.getItem(this.legacyKey);
    if (!raw) return null;
    const legacy = JSON.parse(raw) as Record<string, Partial<LevelResult>>;
    const data = emptySave();
    for (const [key, value] of Object.entries(legacy)) {
      const index = Number(key);
      if (!Number.isInteger(index) || !value || typeof value !== 'object') continue;
      data.sites[index] = {
        completed: value.completed === true,
        bestSavedPct: asNonNegativeInteger(value.bestSavedPct),
        bestSavedCount: 0,
        failures: 0,
      };
    }
    data.started = Object.keys(data.sites).length > 0;
    const completed = Object.entries(data.sites)
      .filter(([, site]) => site.completed)
      .map(([index]) => Number(index));
    data.currentSite = completed.length > 0 ? Math.max(...completed) + 1 : 0;
    return data;
  }

  private normalize(value: unknown): SwarmwrightSaveV2 {
    if (!value || typeof value !== 'object' || (value as { version?: unknown }).version !== 2) {
      this.recoveredCorrupt = true;
      return emptySave();
    }
    const raw = value as Partial<SwarmwrightSaveV2>;
    const data = emptySave();
    data.started = raw.started === true;
    data.currentSite = asNonNegativeInteger(raw.currentSite);
    data.salvage = asNonNegativeInteger(raw.salvage);
    data.rescuedTotal = asNonNegativeInteger(raw.rescuedTotal);
    data.lastSeenUtcMs = typeof raw.lastSeenUtcMs === 'number' && Number.isFinite(raw.lastSeenUtcMs)
      ? Math.max(0, Math.floor(raw.lastSeenUtcMs))
      : null;
    if (raw.sites && typeof raw.sites === 'object') {
      for (const [key, siteValue] of Object.entries(raw.sites)) {
        const index = Number(key);
        if (!Number.isInteger(index) || !siteValue || typeof siteValue !== 'object') continue;
        const site = siteValue as Partial<SiteProgress>;
        data.sites[index] = {
          completed: site.completed === true,
          bestSavedPct: asNonNegativeInteger(site.bestSavedPct),
          bestSavedCount: asNonNegativeInteger(site.bestSavedCount),
          failures: asNonNegativeInteger(site.failures),
        };
      }
    }
    data.atlas = Array.isArray(raw.atlas)
      ? [...new Set(raw.atlas.filter((id): id is string => typeof id === 'string' && id.length > 0))]
      : [];
    const projectIds: WorkshopProjectId[] = [
      'signal-lamp', 'crew-quarters', 'archive-scanner', 'salvage-crane', 'paint-locker', 'yard-gantry',
    ];
    data.workshop = Array.isArray(raw.workshop)
      ? [...new Set(raw.workshop.filter((id): id is WorkshopProjectId => projectIds.includes(id as WorkshopProjectId)))]
      : [];
    const daily = raw.daily;
    if (daily && typeof daily === 'object') {
      data.daily = {
        activeAttemptDate: typeof daily.activeAttemptDate === 'string' ? daily.activeAttemptDate : null,
        lastCompletedDate: typeof daily.lastCompletedDate === 'string' ? daily.lastCompletedDate : null,
        currentChain: asNonNegativeInteger(daily.currentChain),
        bestChain: asNonNegativeInteger(daily.bestChain),
        graceAvailable: daily.graceAvailable !== false,
        totalCompletions: asNonNegativeInteger(daily.totalCompletions),
        rewardsByDate: daily.rewardsByDate && typeof daily.rewardsByDate === 'object'
          ? { ...daily.rewardsByDate }
          : {},
        bestScoreByDate: daily.bestScoreByDate && typeof daily.bestScoreByDate === 'object'
          ? { ...daily.bestScoreByDate }
          : {},
      };
    }
    return data;
  }

  private save(): void {
    try {
      this.storage.setItem(this.key, JSON.stringify(this.data));
    } catch {
      this.storageAvailable = false;
    }
  }
}
