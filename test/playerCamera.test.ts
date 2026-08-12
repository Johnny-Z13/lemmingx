import { describe, expect, it } from 'vitest';
import { PLAYER_CAMERA_ZOOM, playerCameraFrame } from '../src/render/playerCamera';

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
});
