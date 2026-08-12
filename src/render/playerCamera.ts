import type { LevelDefinition } from '../sim/types';

export const PLAYER_CAMERA_ZOOM = 1.1;
export const PLAYER_CAMERA_MAX_ZOOM = 1.8;
const COMPACT_LEVEL_FOCUS_SHIFT_X = 8;

export interface PlayerCameraFrame {
  zoom: number;
  scrollX: number;
  scrollY: number;
}

export type PlayerCameraGestureFrame = PlayerCameraFrame;

interface Point {
  x: number;
  y: number;
}

interface CameraWorldBounds {
  width: number;
  height: number;
}

function clampScroll(targetCenter: number, worldSize: number, visibleSize: number): number {
  if (worldSize <= visibleSize) return (worldSize - visibleSize) / 2;
  return Math.min(worldSize - visibleSize, Math.max(0, targetCenter - visibleSize / 2));
}

function clampZoom(zoom: number): number {
  return Math.min(PLAYER_CAMERA_MAX_ZOOM, Math.max(PLAYER_CAMERA_ZOOM, zoom));
}

/** Keep the world point under `previousAnchor` beneath `currentAnchor`. */
export function playerCameraGestureFrame(
  current: PlayerCameraFrame,
  previousAnchor: Point,
  currentAnchor: Point,
  requestedZoom: number,
  viewport: Point,
  world: CameraWorldBounds,
): PlayerCameraGestureFrame {
  const zoom = clampZoom(requestedZoom);
  const anchorWorldX = current.scrollX + previousAnchor.x / current.zoom;
  const anchorWorldY = current.scrollY + previousAnchor.y / current.zoom;
  const visibleWidth = viewport.x / zoom;
  const visibleHeight = viewport.y / zoom;

  return {
    zoom,
    scrollX: clampScroll(anchorWorldX - currentAnchor.x / zoom + visibleWidth / 2, world.width, visibleWidth),
    scrollY: clampScroll(anchorWorldY - currentAnchor.y / zoom + visibleHeight / 2, world.height, visibleHeight),
  };
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
