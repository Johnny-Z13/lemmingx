import { describe, expect, it } from 'vitest';
import { CrewActionFeedback } from '../src/input/crewActionFeedback';

describe('CrewActionFeedback', () => {
  it('acknowledges accepted and missed first actions, then expires', () => {
    const feedback = new CrewActionFeedback();

    expect(feedback.current(0)).toBeNull();
    feedback.show('missed', 100);
    expect(feedback.current(100)).toBe('MISSED — TAP INSIDE THE GOLD RING');
    expect(feedback.current(1499)).toBe('MISSED — TAP INSIDE THE GOLD RING');
    expect(feedback.current(1500)).toBeNull();

    feedback.show('accepted', 2000);
    expect(feedback.current(2000)).toBe('ORDER SET — BASHER FIRES AT THE DAM');
    feedback.reset();
    expect(feedback.current(2001)).toBeNull();
  });
});
