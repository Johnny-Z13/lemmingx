export type PresentationTier = 'low' | 'medium' | 'high';

export interface PresentationTierInput {
  hardwareConcurrency: number | null;
  deviceMemoryGb: number | null;
  devicePixelRatio: number;
  deviceType: 'desktop' | 'tablet' | 'mobile' | 'unknown';
}

const RANK: Record<PresentationTier, number> = { low: 0, medium: 1, high: 2 };

/** Conservative boot classification: 4-core/4GB phones are deliberately low. */
export function resolvePresentationTier(input: PresentationTierInput): PresentationTier {
  const cores = input.hardwareConcurrency ?? 4;
  const memory = input.deviceMemoryGb ?? 4;
  if (cores <= 4 || memory <= 4 || (input.deviceType === 'mobile' && input.devicePixelRatio > 2)) return 'low';
  if (cores >= 8 && memory >= 8 && input.deviceType !== 'mobile') return 'high';
  return 'medium';
}

export function lowerTier(a: PresentationTier, b: PresentationTier): PresentationTier {
  return RANK[a] <= RANK[b] ? a : b;
}

export function stepDownTier(tier: PresentationTier): PresentationTier {
  return tier === 'high' ? 'medium' : 'low';
}

export function readBootPresentationTier(
  deviceType: PresentationTierInput['deviceType'] = 'unknown',
): PresentationTier {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return 'medium';
  const memoryNavigator = navigator as Navigator & { deviceMemory?: number };
  return resolvePresentationTier({
    hardwareConcurrency: Number.isFinite(navigator.hardwareConcurrency) ? navigator.hardwareConcurrency : null,
    deviceMemoryGb: Number.isFinite(memoryNavigator.deviceMemory) ? memoryNavigator.deviceMemory ?? null : null,
    devicePixelRatio: window.devicePixelRatio || 1,
    deviceType,
  });
}

export interface FrameBudgetObservation {
  changed: boolean;
  tier: PresentationTier;
  longFrame: boolean;
}

/** One-way presentation degradation after three continuous seconds below 30fps. */
export class FrameBudgetMonitor {
  private slowMs = 0;

  constructor(private currentTier: PresentationTier) {}

  get tier(): PresentationTier {
    return this.currentTier;
  }

  constrainTo(tier: PresentationTier): boolean {
    const next = lowerTier(this.currentTier, tier);
    if (next === this.currentTier) return false;
    this.currentTier = next;
    this.slowMs = 0;
    return true;
  }

  observe(frameMs: number): FrameBudgetObservation {
    const bounded = Math.max(0, Math.min(frameMs, 250));
    this.slowMs = frameMs > 1000 / 30 ? this.slowMs + bounded : 0;
    let changed = false;
    if (this.slowMs >= 3000 && this.currentTier !== 'low') {
      this.currentTier = stepDownTier(this.currentTier);
      this.slowMs = 0;
      changed = true;
    }
    return { changed, tier: this.currentTier, longFrame: frameMs > 100 };
  }
}

export function particleBudgetScale(tier: PresentationTier): number {
  return tier === 'low' ? 0.45 : tier === 'medium' ? 0.72 : 1;
}

export function terrainAnimationIntervalMs(tier: PresentationTier): number {
  return tier === 'low' ? 220 : tier === 'medium' ? 165 : 110;
}
