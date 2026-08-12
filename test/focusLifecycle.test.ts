import { describe, expect, it, vi } from 'vitest';
import { FocusLifecycle } from '../src/lifecycle/FocusLifecycle';

describe('FocusLifecycle', () => {
  it('suspends and resumes once per transition', () => {
    const onSuspend = vi.fn();
    const onResume = vi.fn();
    const lifecycle = new FocusLifecycle({ onSuspend, onResume });

    expect(lifecycle.suspend()).toBe(true);
    expect(lifecycle.suspend()).toBe(false);
    expect(lifecycle.isSuspended()).toBe(true);
    expect(onSuspend).toHaveBeenCalledTimes(1);

    expect(lifecycle.resume()).toBe(true);
    expect(lifecycle.resume()).toBe(false);
    expect(lifecycle.isSuspended()).toBe(false);
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('clears state for a level/select transition without firing resume effects', () => {
    const onResume = vi.fn();
    const lifecycle = new FocusLifecycle({ onSuspend: () => {}, onResume });
    lifecycle.suspend();
    lifecycle.clear();
    expect(lifecycle.isSuspended()).toBe(false);
    expect(onResume).not.toHaveBeenCalled();
  });
});
