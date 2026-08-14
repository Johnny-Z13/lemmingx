import type { Lemming, LevelDefinition } from '../sim/types';

export const PLAYER_CAMERA_ZOOM = 1.1;
export const PLAYER_CAMERA_MAX_ZOOM = 1.8;
export const PLAYER_LOCKED_CAMERA_ZOOM = 1;
const COMPACT_LEVEL_FOCUS_SHIFT_X = 8;
const CREW_ZOOM_FOCUS_GAIN = 3.2;
const CREW_ZOOM_FOCUS_MAX_BLEND = 0.82;

export interface PlayerCameraFrame {
  zoom: number;
  scrollX: number;
  scrollY: number;
}

export type PlayerCameraGestureFrame = PlayerCameraFrame;

export interface PlayerCameraFrameOptions {
  /** Fit the authored 960x540 room exactly and disable camera travel. */
  locked?: boolean;
}

interface Point {
  x: number;
  y: number;
}

interface CameraWorldBounds {
  width: number;
  height: number;
}

export interface PlayerCameraSafeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

function clampScroll(targetCenter: number, worldSize: number, visibleSize: number): number {
  if (worldSize <= visibleSize) return (worldSize - visibleSize) / 2;
  return Math.min(worldSize - visibleSize, Math.max(0, targetCenter - visibleSize / 2));
}

function clampPlayerVerticalScroll(
  targetCenter: number,
  worldHeight: number,
  visibleHeight: number,
  viewportHeight: number,
): number {
  // Compact stages already contain a deep ground cross-section below the
  // walking line. Keep that depth beneath the fixed dock instead of allowing
  // vertical pan to drag the crew down behind the controls.
  if (worldHeight <= viewportHeight) return Math.max(0, worldHeight - visibleHeight);
  return clampScroll(targetCenter, worldHeight, visibleHeight);
}

/** Prefer the living crew already in view; fall back to the full living swarm. */
export function playerCameraCrewFocus(
  lemmings: readonly Pick<Lemming, 'x' | 'y' | 'state'>[],
  current: PlayerCameraFrame,
  viewport: Point,
): Point | undefined {
  const living = lemmings.filter(({ state }) => state !== 'dead' && state !== 'exited');
  if (living.length === 0) return undefined;

  const margin = 24 / current.zoom;
  const visibleRight = current.scrollX + viewport.x / current.zoom;
  const visibleBottom = current.scrollY + viewport.y / current.zoom;
  const visible = living.filter(({ x, y }) => (
    x >= current.scrollX - margin && x <= visibleRight + margin
    && y >= current.scrollY - margin && y <= visibleBottom + margin
  ));
  const crew = visible.length > 0 ? visible : living;
  const total = crew.reduce((sum, lemming) => ({ x: sum.x + lemming.x, y: sum.y + lemming.y }), { x: 0, y: 0 });
  return { x: total.x / crew.length, y: total.y / crew.length };
}

function attentionPriority(lemming: Pick<Lemming, 'state' | 'fuseMs'>): number {
  if (lemming.fuseMs !== null) return 4;
  if (lemming.state === 'faller' || lemming.state === 'treading') return 3;
  if (['blocker', 'builder', 'basher', 'miner', 'digger', 'climber'].includes(lemming.state)) return 2;
  return 1;
}

/**
 * Apply the smallest scroll correction that keeps the most consequential crew
 * inside the unobscured part of the canvas. Lower-priority walkers only guide
 * the frame when no worker or endangered lemming needs attention.
 */
export function playerCameraAttentionFrame(
  lemmings: readonly Pick<Lemming, 'x' | 'y' | 'state' | 'fuseMs'>[],
  current: PlayerCameraFrame,
  viewport: Point,
  world: CameraWorldBounds,
  insets: PlayerCameraSafeInsets,
): PlayerCameraFrame {
  const living = lemmings.filter(({ state }) => state !== 'dead' && state !== 'exited');
  if (living.length === 0) return current;
  const highestPriority = Math.max(...living.map(attentionPriority));
  const important = living.filter((lemming) => attentionPriority(lemming) === highestPriority);
  const pad = 22;
  const safeLeft = insets.left + pad;
  const safeRight = viewport.x - insets.right - pad;
  const safeTop = insets.top + pad;
  const safeBottom = viewport.y - insets.bottom - pad;
  const screen = important.map(({ x, y }) => ({
    x: (x - current.scrollX) * current.zoom,
    y: (y - current.scrollY) * current.zoom,
  }));
  const minX = Math.min(...screen.map(({ x }) => x));
  const maxX = Math.max(...screen.map(({ x }) => x));
  const minY = Math.min(...screen.map(({ y }) => y));
  const maxY = Math.max(...screen.map(({ y }) => y));
  const correction = (min: number, max: number, safeMin: number, safeMax: number) => {
    if (max - min > safeMax - safeMin) return (min + max - safeMin - safeMax) / 2;
    if (min < safeMin) return min - safeMin;
    if (max > safeMax) return max - safeMax;
    return 0;
  };
  const visibleWidth = viewport.x / current.zoom;
  const visibleHeight = viewport.y / current.zoom;
  const targetCenterX = current.scrollX + visibleWidth / 2 + correction(minX, maxX, safeLeft, safeRight) / current.zoom;
  const targetCenterY = current.scrollY + visibleHeight / 2 + correction(minY, maxY, safeTop, safeBottom) / current.zoom;
  return {
    ...current,
    scrollX: clampScroll(targetCenterX, world.width, visibleWidth),
    scrollY: clampPlayerVerticalScroll(targetCenterY, world.height, visibleHeight, viewport.y),
  };
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
  crewFocus?: Point,
): PlayerCameraGestureFrame {
  const zoom = clampZoom(requestedZoom);
  const anchorWorldX = current.scrollX + previousAnchor.x / current.zoom;
  const anchorWorldY = current.scrollY + previousAnchor.y / current.zoom;
  const visibleWidth = viewport.x / zoom;
  const visibleHeight = viewport.y / zoom;
  const anchorCenterX = anchorWorldX - currentAnchor.x / zoom + visibleWidth / 2;
  const anchorCenterY = anchorWorldY - currentAnchor.y / zoom + visibleHeight / 2;
  const focusBlend = crewFocus && zoom > current.zoom
    ? Math.min(CREW_ZOOM_FOCUS_MAX_BLEND, Math.log(zoom / current.zoom) * CREW_ZOOM_FOCUS_GAIN)
    : 0;
  const targetCenterX = anchorCenterX + ((crewFocus?.x ?? anchorCenterX) - anchorCenterX) * focusBlend;
  const targetCenterY = anchorCenterY + ((crewFocus?.y ?? anchorCenterY) - anchorCenterY) * focusBlend;

  return {
    zoom,
    scrollX: clampScroll(targetCenterX, world.width, visibleWidth),
    scrollY: clampPlayerVerticalScroll(
      targetCenterY,
      world.height,
      visibleHeight,
      viewport.y,
    ),
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
  options: PlayerCameraFrameOptions = {},
): PlayerCameraFrame {
  if (options.locked) {
    return { zoom: PLAYER_LOCKED_CAMERA_ZOOM, scrollX: 0, scrollY: 0 };
  }
  const visibleWidth = viewport.width / PLAYER_CAMERA_ZOOM;
  const visibleHeight = viewport.height / PLAYER_CAMERA_ZOOM;
  const compactWidth = level.width <= viewport.width;
  const targetX = compactWidth
    ? level.width / 2 + COMPACT_LEVEL_FOCUS_SHIFT_X
    : level.spawn.x;

  return {
    zoom: PLAYER_CAMERA_ZOOM,
    scrollX: clampScroll(targetX, level.width, visibleWidth),
    scrollY: clampPlayerVerticalScroll(level.spawn.y, level.height, visibleHeight, viewport.height),
  };
}

/** Authored vertical framing plus a horizontal landmark target for short pans. */
export function playerCameraLandmarkFrame(
  level: Pick<LevelDefinition, 'width' | 'height' | 'spawn'>,
  viewport: { width: number; height: number },
  zoom: number,
  focusX: number,
): PlayerCameraFrame {
  const safeZoom = clampZoom(zoom);
  const visibleWidth = viewport.width / safeZoom;
  const visibleHeight = viewport.height / safeZoom;
  return {
    zoom: safeZoom,
    scrollX: clampScroll(focusX, level.width, visibleWidth),
    scrollY: clampPlayerVerticalScroll(level.spawn.y, level.height, visibleHeight, viewport.height),
  };
}
