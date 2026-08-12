import { describe, expect, it } from 'vitest';
import { TouchCameraGesture } from '../src/input/TouchCameraGesture';

describe('TouchCameraGesture', () => {
  it('takes ownership on the second touch and reports pan plus pinch deltas', () => {
    const gesture = new TouchCameraGesture();

    expect(gesture.begin(1, { x: 100, y: 100 })).toBe(false);
    expect(gesture.begin(2, { x: 200, y: 100 })).toBe(true);
    expect(gesture.move(2, { x: 230, y: 120 })).toEqual({
      owned: true,
      previousCenter: { x: 150, y: 100 },
      currentCenter: { x: 165, y: 110 },
      scale: Math.hypot(130, 20) / 100,
    });
  });

  it('keeps the camera in control until all pinch touches lift', () => {
    const gesture = new TouchCameraGesture();
    gesture.begin(1, { x: 100, y: 100 });
    gesture.begin(2, { x: 200, y: 100 });

    expect(gesture.end(2)).toBe(true);
    expect(gesture.move(1, { x: 110, y: 100 })).toEqual({ owned: true });
    expect(gesture.end(1)).toBe(true);
    expect(gesture.begin(3, { x: 120, y: 100 })).toBe(false);
  });
});
