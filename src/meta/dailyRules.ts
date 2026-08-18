import type { LevelDefinition } from '../sim/types';
import type { DailyRescueDefinition } from './catalog';

/** Apply the visible Daily rule to a freshly-created authored Site. */
export function configureDailyLevel(
  level: LevelDefinition,
  daily: DailyRescueDefinition,
): LevelDefinition {
  if (daily.variant === 'perfect') level.targetSaved = level.totalLemmings;
  if (daily.variant === 'rush') level.timeLimitMs = Math.min(level.timeLimitMs ?? 120_000, 120_000);
  return level;
}
