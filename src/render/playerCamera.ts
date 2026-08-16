import type { Lemming, LevelDefinition } from '../sim/types';

export const PLAYER_CAMERA_ZOOM = 1.2;
export const PLAYER_CAMERA_MIN_ZOOM = 1.1;
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

/** Scripted event pans yield to active and recently released user camera control. */
export function canScriptPlayerCameraFocus(
  minimapActive: boolean,
  nowMs: number,
  blockedUntilMs: number,
): boolean {
  return !minimapActive && nowMs >= blockedUntilMs;
}

/**
 * A Hero beat's saved frame is its ownership token: every user camera path
 * invalidates it after focus. Grace from before the explicit Hero action must
 * not strand the camera at the cinematic zoom.
 */
export function canRestoreHeroCamera(
  hasReturnFrame: boolean,
  minimapActive: boolean,
): boolean {
  return hasReturnFrame && !minimapActive;
}

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

export interface PlayerCameraBounds extends CameraWorldBounds {
  x: number;
  y: number;
}

export interface PlayerCameraSafeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface ClientRectLike {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type PlayerCameraOcclusionRect = ClientRectLike;

/** Clip DOM chrome to the canvas and convert it into Phaser viewport pixels. */
export function playerCameraOcclusionRects(
  canvas: ClientRectLike,
  viewport: Point,
  occluders: readonly ClientRectLike[],
): PlayerCameraOcclusionRect[] {
  const canvasWidth = Math.max(1, canvas.right - canvas.left);
  const canvasHeight = Math.max(1, canvas.bottom - canvas.top);
  return occluders.flatMap((rect) => {
    const left = Math.max(canvas.left, rect.left);
    const right = Math.min(canvas.right, rect.right);
    const top = Math.max(canvas.top, rect.top);
    const bottom = Math.min(canvas.bottom, rect.bottom);
    if (right <= left || bottom <= top) return [];
    return [{
      left: (left - canvas.left) * viewport.x / canvasWidth,
      right: (right - canvas.left) * viewport.x / canvasWidth,
      top: (top - canvas.top) * viewport.y / canvasHeight,
      bottom: (bottom - canvas.top) * viewport.y / canvasHeight,
    }];
  });
}

/**
 * Phaser clamps raw scroll around the unzoomed viewport centre. Pad its bounds
 * by the zoom crop so the visible world rectangle can still reach every edge.
 */
export function playerCameraPaddedBounds(
  world: CameraWorldBounds,
  viewport: CameraWorldBounds,
  visible: CameraWorldBounds,
): PlayerCameraBounds {
  const x = Math.min(0, visible.width - viewport.width);
  const y = Math.min(0, visible.height - viewport.height);
  return {
    x,
    y,
    width: world.width - x,
    height: world.height - y,
  };
}

/** Convert persistent DOM chrome at the canvas edges into Phaser camera pixels. */
export function playerCameraOcclusionInsets(
  canvas: ClientRectLike,
  viewport: Point,
  occluders: readonly ClientRectLike[],
): PlayerCameraSafeInsets {
  const canvasWidth = Math.max(1, canvas.right - canvas.left);
  const canvasHeight = Math.max(1, canvas.bottom - canvas.top);
  let top = 0;
  let bottom = 0;
  for (const rect of occluders) {
    if (rect.right <= canvas.left || rect.left >= canvas.right) continue;
    const overlapTop = Math.max(canvas.top, rect.top);
    const overlapBottom = Math.min(canvas.bottom, rect.bottom);
    if (overlapBottom <= overlapTop) continue;
    const midpoint = (overlapTop + overlapBottom) / 2;
    if (midpoint <= (canvas.top + canvas.bottom) / 2) {
      top = Math.max(top, (overlapBottom - canvas.top) * viewport.y / canvasHeight);
    } else {
      bottom = Math.max(bottom, (canvas.bottom - overlapTop) * viewport.y / canvasHeight);
    }
  }
  return { top, right: 12 * viewport.x / canvasWidth, bottom, left: 12 * viewport.x / canvasWidth };
}

/** Add scrollable world space behind the dock so real terrain can move above it. */
export function playerCameraOccludedWorldHeight(
  worldHeight: number,
  bottomInset: number,
  zoom: number,
): number {
  return worldHeight + Math.max(0, bottomInset) / Math.max(zoom, 0.001);
}

/** Frame the authored world bottom at the bottom of the unobscured playfield. */
export function playerCameraBottomSafeScroll(
  worldHeight: number,
  viewportHeight: number,
  bottomInset: number,
  zoom: number,
): number {
  const safeHeight = Math.max(1, viewportHeight - Math.max(0, bottomInset));
  return Math.max(0, worldHeight - safeHeight / Math.max(zoom, 0.001));
}

/** Keep a one-screen room locked at 1x/X=0 while lifting its route above the fixed dock. */
export function playerCameraLockedHudSafeFrame(
  worldHeight: number,
  viewportHeight: number,
  bottomInset: number,
): PlayerCameraFrame {
  return {
    zoom: PLAYER_LOCKED_CAMERA_ZOOM,
    scrollX: 0,
    scrollY: playerCameraBottomSafeScroll(
      worldHeight,
      viewportHeight,
      bottomInset,
      PLAYER_LOCKED_CAMERA_ZOOM,
    ),
  };
}

/** Absolute minimap framing that keeps the chosen X and respects HUD space. */
export function playerCameraMinimapFrame(
  world: { width: number; height: number },
  viewport: { width: number; height: number },
  zoom: number,
  bottomInset: number,
  fractionX: number,
  fractionY: number,
): PlayerCameraFrame {
  const safeZoom = clampZoom(zoom);
  const visibleWidth = viewport.width / safeZoom;
  const visibleHeight = viewport.height / safeZoom;
  const scrollX = clampScroll(
    Math.min(1, Math.max(0, fractionX)) * world.width,
    world.width,
    visibleWidth,
  );
  if (world.height <= viewport.height) {
    return {
      zoom: safeZoom,
      scrollX,
      scrollY: playerCameraBottomSafeScroll(world.height, viewport.height, bottomInset, safeZoom),
    };
  }
  const extendedHeight = playerCameraOccludedWorldHeight(world.height, bottomInset, safeZoom);
  const desiredScrollY = Math.min(1, Math.max(0, fractionY)) * world.height - visibleHeight / 2;
  return {
    zoom: safeZoom,
    scrollX,
    scrollY: Math.min(Math.max(0, extendedHeight - visibleHeight), Math.max(0, desiredScrollY)),
  };
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
  occlusions: readonly PlayerCameraOcclusionRect[] = [],
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
  let minX = Math.min(...screen.map(({ x }) => x));
  let maxX = Math.max(...screen.map(({ x }) => x));
  let minY = Math.min(...screen.map(({ y }) => y));
  let maxY = Math.max(...screen.map(({ y }) => y));
  const correction = (min: number, max: number, safeMin: number, safeMax: number) => {
    if (max - min > safeMax - safeMin) return (min + max - safeMin - safeMax) / 2;
    if (min < safeMin) return min - safeMin;
    if (max > safeMax) return max - safeMax;
    return 0;
  };
  let correctionX = correction(minX, maxX, safeLeft, safeRight);
  let correctionY = correction(minY, maxY, safeTop, safeBottom);
  minX -= correctionX;
  maxX -= correctionX;
  minY -= correctionY;
  maxY -= correctionY;
  for (const rect of occlusions) {
    const padded = { left: minX - pad, right: maxX + pad, top: minY - pad, bottom: maxY + pad };
    if (padded.right <= rect.left || padded.left >= rect.right || padded.bottom <= rect.top || padded.top >= rect.bottom) continue;
    const candidates = [
      { dx: rect.left - padded.right, dy: 0 },
      { dx: rect.right - padded.left, dy: 0 },
      { dx: 0, dy: rect.top - padded.bottom },
      { dx: 0, dy: rect.bottom - padded.top },
    ].filter(({ dx, dy }) => (
      padded.left + dx >= safeLeft - pad && padded.right + dx <= safeRight + pad
      && padded.top + dy >= safeTop - pad && padded.bottom + dy <= safeBottom + pad
    ));
    const move = candidates.sort((a, b) => Math.hypot(a.dx, a.dy) - Math.hypot(b.dx, b.dy))[0];
    if (!move) continue;
    minX += move.dx;
    maxX += move.dx;
    minY += move.dy;
    maxY += move.dy;
    correctionX -= move.dx;
    correctionY -= move.dy;
  }
  const visibleWidth = viewport.x / current.zoom;
  const visibleHeight = viewport.y / current.zoom;
  const targetCenterX = current.scrollX + visibleWidth / 2 + correctionX / current.zoom;
  const targetCenterY = current.scrollY + visibleHeight / 2 + correctionY / current.zoom;
  return {
    ...current,
    scrollX: clampScroll(targetCenterX, world.width, visibleWidth),
    scrollY: clampPlayerVerticalScroll(targetCenterY, world.height, visibleHeight, viewport.y),
  };
}

/** Touch release positions are not hover and must never drive edge scrolling. */
export function canEdgeHoverScroll(pointerSeen: boolean, pointerWasTouch: boolean): boolean {
  return pointerSeen && !pointerWasTouch;
}

function clampZoom(zoom: number): number {
  return Math.min(PLAYER_CAMERA_MAX_ZOOM, Math.max(PLAYER_CAMERA_MIN_ZOOM, zoom));
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
