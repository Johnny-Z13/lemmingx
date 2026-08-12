import type { LemmingDisplayPoint } from '../render/crowdLayout';
import type { Lemming } from '../sim/types';

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
): Lemming | null {
  const radiusSq = radius ** 2;
  const candidates = lemmings.flatMap((lemming) => {
    if (lemming.state === 'dead' || lemming.state === 'exited') return [];
    const point = displayPoints.get(lemming.id) ?? lemming;
    const targetY = point.y + 4;
    const distanceSq = (point.x - worldX) ** 2 + (targetY - worldY) ** 2;
    return distanceSq <= radiusSq ? [{ lemming, distanceSq, displayY: point.y }] : [];
  });

  candidates.sort((a, b) =>
    a.distanceSq - b.distanceSq ||
    b.displayY - a.displayY ||
    a.lemming.id - b.lemming.id,
  );
  return candidates[0]?.lemming ?? null;
}
