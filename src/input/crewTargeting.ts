import type { LemmingDisplayPoint } from '../render/crowdLayout';
import type { Lemming } from '../sim/types';

export interface CrewTargetMetric {
  readonly distanceSq: number;
  /** Gear/effects outrank body, which outranks the surrounding touch halo. */
  readonly visualPriority: number;
}

/**
 * Pick from render positions without ever feeding crowd fan-out back into sim.
 * Equal-distance overlaps resolve front-to-back, then by stable crew ID.
 */
export function selectCrewTarget(
  lemmings: readonly Lemming[],
  displayPoints: ReadonlyMap<number, LemmingDisplayPoint>,
  worldX: number,
  worldY: number,
  radius: number,
  targetYFor: (lemming: Lemming, point: LemmingDisplayPoint) => number = (_lemming, point) => point.y + 4,
  metricFor?: (
    lemming: Lemming,
    point: LemmingDisplayPoint,
    worldX: number,
    worldY: number,
    targetY: number,
  ) => CrewTargetMetric,
): Lemming | null {
  const radiusSq = radius ** 2;
  const candidates = lemmings.flatMap((lemming, renderOrder) => {
    if (lemming.state === 'dead' || lemming.state === 'exited') return [];
    const point = displayPoints.get(lemming.id) ?? lemming;
    const targetY = targetYFor(lemming, point);
    const metric = metricFor?.(lemming, point, worldX, worldY, targetY) ?? {
      distanceSq: (point.x - worldX) ** 2 + (targetY - worldY) ** 2,
      visualPriority: 0,
    };
    return metric.distanceSq <= radiusSq
      ? [{ lemming, ...metric, displayY: point.y, renderOrder }]
      : [];
  });

  candidates.sort((a, b) =>
    b.visualPriority - a.visualPriority ||
    (metricFor && a.visualPriority > 0 ? b.renderOrder - a.renderOrder : 0) ||
    a.distanceSq - b.distanceSq ||
    b.displayY - a.displayY ||
    a.lemming.id - b.lemming.id,
  );
  return candidates[0]?.lemming ?? null;
}
