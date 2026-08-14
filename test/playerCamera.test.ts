import { describe, expect, it } from 'vitest';
import {
  PLAYER_CAMERA_MAX_ZOOM,
  PLAYER_CAMERA_ZOOM,
  PLAYER_LOCKED_CAMERA_ZOOM,
  playerCameraAttentionFrame,
  playerCameraCrewFocus,
  playerCameraFrame,
  playerCameraGestureFrame,
  playerCameraLandmarkFrame,
} from '../src/render/playerCamera';

describe('playerCameraFrame', () => {
  it('lifts the compact-level ground line while magnifying the crew', () => {
    const frame = playerCameraFrame(
      { width: 960, height: 540, spawn: { x: 400, y: 410 } },
      { width: 960, height: 540 },
    );
    const groundScreenY = (430 - frame.scrollY) * frame.zoom;

    expect(frame.zoom).toBe(PLAYER_CAMERA_ZOOM);
    expect(frame.zoom).toBeGreaterThan(1);
    expect(groundScreenY).toBeLessThan(422);
    expect(groundScreenY).toBeGreaterThan(416);
  });

  it('opens wide levels around the hatch instead of jumping to world centre', () => {
    const frame = playerCameraFrame(
      { width: 1600, height: 540, spawn: { x: 100, y: 410 } },
      { width: 960, height: 540 },
    );

    expect(frame.scrollX).toBe(0);
    expect(frame.scrollY).toBeGreaterThan(0);
  });

  it('locks an authored one-screen room to the exact viewport', () => {
    const frame = playerCameraFrame(
      { width: 960, height: 540, spawn: { x: 80, y: 410 } },
      { width: 960, height: 540 },
      { locked: true },
    );

    expect(frame).toEqual({ zoom: PLAYER_LOCKED_CAMERA_ZOOM, scrollX: 0, scrollY: 0 });
  });

  it('frames hatch and exit landmarks without changing authored vertical composition', () => {
    const level = { width: 1200, height: 540, spawn: { x: 80, y: 410 } };
    const viewport = { width: 960, height: 540 };
    const hatch = playerCameraLandmarkFrame(level, viewport, PLAYER_CAMERA_ZOOM, 80);
    const exit = playerCameraLandmarkFrame(level, viewport, PLAYER_CAMERA_ZOOM, 1140);

    expect(hatch.scrollX).toBe(0);
    expect(exit.scrollX).toBeCloseTo(1200 - 960 / PLAYER_CAMERA_ZOOM);
    expect(exit.scrollY).toBe(hatch.scrollY);
  });

  it('does not let vertical pan drag a compact-level ground line behind the dock', () => {
    const initial = playerCameraFrame(
      { width: 960, height: 540, spawn: { x: 400, y: 410 } },
      { width: 960, height: 540 },
    );
    const frame = playerCameraGestureFrame(
      initial,
      { x: 480, y: 270 },
      { x: 480, y: 500 },
      initial.zoom,
      { x: 960, y: 540 },
      { width: 960, height: 540 },
    );
    const groundScreenY = (430 - frame.scrollY) * frame.zoom;

    expect(frame.scrollY).toBeCloseTo(initial.scrollY);
    expect(groundScreenY).toBeLessThan(422);
  });

  it('keeps the pinched world point under the moving finger midpoint', () => {
    const frame = playerCameraGestureFrame(
      { zoom: 1.1, scrollX: 40, scrollY: 30 },
      { x: 400, y: 220 },
      { x: 430, y: 205 },
      1.4,
      { x: 960, y: 540 },
      { width: 1600, height: 900 },
    );
    const oldWorldPoint = { x: 40 + 400 / 1.1, y: 30 + 220 / 1.1 };
    const newWorldPoint = { x: frame.scrollX + 430 / frame.zoom, y: frame.scrollY + 205 / frame.zoom };

    expect(frame.zoom).toBe(1.4);
    expect(newWorldPoint.x).toBeCloseTo(oldWorldPoint.x);
    expect(newWorldPoint.y).toBeCloseTo(oldWorldPoint.y);
  });

  it('gently biases zoom-in toward the living crew focus', () => {
    const current = { zoom: 1.1, scrollX: 200, scrollY: 100 };
    const anchor = { x: 850, y: 440 };
    const viewport = { x: 960, y: 540 };
    const world = { width: 2000, height: 1200 };
    const crewFocus = { x: 400, y: 260 };
    const anchored = playerCameraGestureFrame(current, anchor, anchor, 1.45, viewport, world);
    const focused = playerCameraGestureFrame(current, anchor, anchor, 1.45, viewport, world, crewFocus);
    const visibleWidth = viewport.x / focused.zoom;
    const visibleHeight = viewport.y / focused.zoom;
    const anchoredCenter = { x: anchored.scrollX + visibleWidth / 2, y: anchored.scrollY + visibleHeight / 2 };
    const focusedCenter = { x: focused.scrollX + visibleWidth / 2, y: focused.scrollY + visibleHeight / 2 };
    const distance = (point: { x: number; y: number }) => Math.hypot(point.x - crewFocus.x, point.y - crewFocus.y);

    expect(distance(focusedCenter)).toBeLessThan(distance(anchoredCenter) * 0.25);
    expect(focusedCenter).not.toEqual(crewFocus);
  });

  it('leaves zoom-out anchored to the gesture instead of pulling at the crew', () => {
    const current = { zoom: 1.45, scrollX: 200, scrollY: 100 };
    const anchor = { x: 850, y: 440 };
    const viewport = { x: 960, y: 540 };
    const world = { width: 2000, height: 1200 };
    const anchored = playerCameraGestureFrame(current, anchor, anchor, 1.1, viewport, world);
    const focused = playerCameraGestureFrame(current, anchor, anchor, 1.1, viewport, world, { x: 400, y: 260 });

    expect(focused).toEqual(anchored);
  });

  it('focuses living visible crew without letting dead or distant outliers pull the camera', () => {
    const focus = playerCameraCrewFocus(
      [
        { x: 120, y: 200, state: 'walker' },
        { x: 180, y: 220, state: 'basher' },
        { x: 400, y: 260, state: 'dead' },
        { x: 1400, y: 220, state: 'walker' },
      ],
      { zoom: 1.2, scrollX: 0, scrollY: 0 },
      { x: 960, y: 540 },
    );

    expect(focus).toEqual({ x: 150, y: 210 });
  });

  it('clamps zoom and camera scroll to the authored world', () => {
    const frame = playerCameraGestureFrame(
      { zoom: 1.1, scrollX: 0, scrollY: 0 },
      { x: 0, y: 0 },
      { x: 900, y: 500 },
      9,
      { x: 960, y: 540 },
      { width: 960, height: 540 },
    );

    expect(frame.zoom).toBe(PLAYER_CAMERA_MAX_ZOOM);
    expect(frame.scrollX).toBe(0);
    expect(frame.scrollY).toBe(240);
  });

  it('nudges an active worker out from beneath the control belt', () => {
    const frame = playerCameraAttentionFrame(
      [
        { x: 500, y: 505, state: 'builder', fuseMs: null },
        { x: 300, y: 250, state: 'walker', fuseMs: null },
      ],
      { zoom: 1, scrollX: 0, scrollY: 0 },
      { x: 960, y: 540 },
      { width: 1200, height: 900 },
      { top: 48, right: 12, bottom: 76, left: 12 },
    );

    expect(frame.scrollY).toBe(63);
    expect((505 - frame.scrollY) * frame.zoom).toBe(442);
  });

  it('prioritizes an endangered lemming over ordinary walkers', () => {
    const frame = playerCameraAttentionFrame(
      [
        { x: 100, y: 250, state: 'walker', fuseMs: null },
        { x: 1100, y: 250, state: 'faller', fuseMs: null },
      ],
      { zoom: 1, scrollX: 0, scrollY: 0 },
      { x: 960, y: 540 },
      { width: 1600, height: 900 },
      { top: 48, right: 12, bottom: 76, left: 12 },
    );

    expect(frame.scrollX).toBe(174);
    expect((1100 - frame.scrollX) * frame.zoom).toBe(926);
  });
});
