import { describe, expect, it } from 'vitest';
import {
  movedPastToolHoldThreshold,
  toolHoldLabelPosition,
} from '../src/ui/ToolHoldLabel';

describe('tool hold labels', () => {
  it('keeps tiny touch wobble but yields to an eight-pixel scroll or drag', () => {
    expect(movedPastToolHoldThreshold(100, 100, 105, 105)).toBe(false);
    expect(movedPastToolHoldThreshold(100, 100, 108, 100)).toBe(true);
  });

  it('centres above an ordinary ribbon tool', () => {
    expect(toolHoldLabelPosition(
      { left: 200, top: 320, right: 248, bottom: 368, width: 48, height: 48 },
      { width: 64, height: 26 },
      844,
      390,
    )).toEqual({ left: 224, top: 286 });
  });

  it('clamps the bubble inside both phone edges', () => {
    const label = { width: 80, height: 26 };
    expect(toolHoldLabelPosition(
      { left: 0, top: 320, right: 48, bottom: 368, width: 48, height: 48 },
      label,
      390,
      844,
    ).left).toBe(48);
    expect(toolHoldLabelPosition(
      { left: 360, top: 320, right: 408, bottom: 368, width: 48, height: 48 },
      label,
      390,
      844,
    ).left).toBe(342);
  });
});
