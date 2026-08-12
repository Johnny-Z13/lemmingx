import type { LevelDefinition } from '../sim/types';

export const PLAYER_CAMERA_ZOOM = 1.1;
const COMPACT_LEVEL_FOCUS_SHIFT_X = 8;

export interface PlayerCameraFrame {
  zoom: number;
  scrollX: number;
  scrollY: number;
}

function clampScroll(targetCenter: number, worldSize: number, visibleSize: number): number {
  if (worldSize <= visibleSize) return (worldSize - visibleSize) / 2;
  return Math.min(worldSize - visibleSize, Math.max(0, targetCenter - visibleSize / 2));
}

/**
 * Slightly magnifies the player build while keeping compact campaign stages
 * balanced between their authored left-to-right landmarks. Wide/tall stages
 * still open around the hatch and retain ordinary camera panning.
 */
export function playerCameraFrame(
  level: Pick<LevelDefinition, 'width' | 'height' | 'spawn'>,
  viewport: { width: number; height: number },
): PlayerCameraFrame {
  const visibleWidth = viewport.width / PLAYER_CAMERA_ZOOM;
  const visibleHeight = viewport.height / PLAYER_CAMERA_ZOOM;
  const compactWidth = level.width <= viewport.width;
  const targetX = compactWidth
    ? level.width / 2 + COMPACT_LEVEL_FOCUS_SHIFT_X
    : level.spawn.x;

  return {
    zoom: PLAYER_CAMERA_ZOOM,
    scrollX: clampScroll(targetX, level.width, visibleWidth),
    scrollY: clampScroll(level.spawn.y, level.height, visibleHeight),
  };
}
