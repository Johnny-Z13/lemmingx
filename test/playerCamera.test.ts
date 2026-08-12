import { describe, expect, it } from 'vitest';
import {
  PLAYER_CAMERA_MAX_ZOOM,
  PLAYER_CAMERA_ZOOM,
  playerCameraFrame,
  playerCameraGestureFrame,
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
    expect(frame.scrollY).toBe(0);
  });
});
