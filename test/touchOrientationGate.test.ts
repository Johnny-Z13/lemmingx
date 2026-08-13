import { describe, expect, it, vi } from 'vitest';
import { TouchOrientationGate } from '../src/lifecycle/TouchOrientationGate';

class FakeOrientationQuery {
  matches: boolean;
  private readonly listeners = new Set<() => void>();

  constructor(matches: boolean) {
    this.matches = matches;
  }

  addEventListener(_type: 'change', listener: () => void): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: 'change', listener: () => void): void {
    this.listeners.delete(listener);
  }

  setPortrait(matches: boolean): void {
    this.matches = matches;
    for (const listener of this.listeners) listener();
  }
}

describe('TouchOrientationGate', () => {
  it('suspends immediately when a Mobile device opens in portrait', () => {
    const query = new FakeOrientationQuery(true);
    const onPortrait = vi.fn();
    const gate = new TouchOrientationGate(query, onPortrait);

    gate.start();

    expect(gate.isPortrait()).toBe(true);
    expect(onPortrait).toHaveBeenCalledTimes(1);
  });

  it('reports portrait transitions and stops listening after cleanup', () => {
    const query = new FakeOrientationQuery(false);
    const onPortrait = vi.fn();
    const gate = new TouchOrientationGate(query, onPortrait);

    gate.start();
    query.setPortrait(true);
    query.setPortrait(false);
    gate.stop();
    query.setPortrait(true);

    expect(onPortrait).toHaveBeenCalledTimes(1);
  });
});
