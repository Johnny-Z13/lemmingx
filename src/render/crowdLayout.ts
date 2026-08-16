import type { Lemming } from '../sim/types';

export interface LemmingDisplayPoint {
  readonly x: number;
  readonly y: number;
}

/** Legacy procedural spacing remains available to isolated renderer tests. */
export const CROWD_SPACING = 7.5;
/** The generated rounded family keeps at least half of each body exposed. */
export const SALVAGER_CROWD_SPACING = 20;
const CROWD_JOIN_X = 7;
const CROWD_JOIN_Y = 4;
const JITTER_X = 0.2;
const JITTER_Y = 0.7;

/**
 * Fan visually stacked lemmings around their shared sim position.
 *
 * This is deliberately render-only: movement, terrain collision, traps, and
 * deterministic level solutions continue to use the untouched sim positions.
 */
export function layoutLemmingCrowds(
  lemmings: readonly Lemming[],
  timeMs: number,
  spacing = CROWD_SPACING,
  bounds?: { readonly minX: number; readonly maxX: number },
): Map<number, LemmingDisplayPoint> {
  const points = new Map<number, LemmingDisplayPoint>();
  const live = lemmings.filter((lemming) => lemming.state !== 'dead' && lemming.state !== 'exited');
  const visited = new Set<number>();

  for (const seed of live) {
    if (visited.has(seed.id)) continue;
    const crowd: Lemming[] = [];
    const pending = [seed];
    visited.add(seed.id);

    while (pending.length > 0) {
      const current = pending.pop() as Lemming;
      crowd.push(current);
      for (const candidate of live) {
        if (visited.has(candidate.id)) continue;
        if (
          Math.abs(candidate.x - current.x) <= CROWD_JOIN_X &&
          Math.abs(candidate.y - current.y) <= CROWD_JOIN_Y
        ) {
          visited.add(candidate.id);
          pending.push(candidate);
        }
      }
    }

    if (crowd.length === 1) {
      points.set(seed.id, { x: seed.x, y: seed.y });
      continue;
    }

    // Display slots must not change when a job/fuse changes: state may affect
    // draw depth, never the crew member's render position.
    crowd.sort((a, b) => a.x - b.x || a.id - b.id);
    const centerX = crowd.reduce((sum, lemming) => sum + lemming.x, 0) / crowd.length;
    const rawJitterX = crowd.map((lemming) => Math.sin(timeMs * 0.006 + lemming.id * 2.17) * JITTER_X);
    const rawJitterY = crowd.map((lemming) => Math.sin(timeMs * 0.008 + lemming.id * 1.73) * JITTER_Y);
    const meanJitterX = rawJitterX.reduce((sum, value) => sum + value, 0) / crowd.length;
    const meanJitterY = rawJitterY.reduce((sum, value) => sum + value, 0) / crowd.length;

    const slots = crowd.map((lemming, index) => {
      const jitterX = rawJitterX[index] - meanJitterX;
      const jitterY = rawJitterY[index] - meanJitterY;
      return {
        lemming,
        x: centerX + (index - (crowd.length - 1) / 2) * spacing + jitterX,
        y: lemming.y + jitterY,
      };
    });
    let shiftX = 0;
    if (bounds) {
      const left = Math.min(...slots.map(({ x }) => x));
      const right = Math.max(...slots.map(({ x }) => x));
      const available = bounds.maxX - bounds.minX;
      if (right - left > available) {
        shiftX = bounds.minX + available / 2 - (left + right) / 2;
      } else if (left < bounds.minX) {
        shiftX = bounds.minX - left;
      } else if (right > bounds.maxX) {
        shiftX = bounds.maxX - right;
      }
    }
    for (const { lemming, x, y } of slots) points.set(lemming.id, { x: x + shiftX, y });
  }

  for (const lemming of lemmings) {
    if (!points.has(lemming.id)) points.set(lemming.id, { x: lemming.x, y: lemming.y });
  }
  return points;
}
