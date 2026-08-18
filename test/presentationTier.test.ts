import { describe, expect, it } from 'vitest';
import {
  FrameBudgetMonitor,
  lowerTier,
  resolvePresentationTier,
  terrainAnimationIntervalMs,
} from '../src/performance/presentationTier';

describe('presentation tiers', () => {
  it('classifies the 4-core / 4GB target phone conservatively', () => {
    expect(resolvePresentationTier({
      hardwareConcurrency: 4,
      deviceMemoryGb: 4,
      devicePixelRatio: 1,
      deviceType: 'mobile',
    })).toBe('low');
  });

  it('uses medium for capable phones and high only for strong non-mobile hardware', () => {
    expect(resolvePresentationTier({ hardwareConcurrency: 8, deviceMemoryGb: 6, devicePixelRatio: 2, deviceType: 'mobile' })).toBe('medium');
    expect(resolvePresentationTier({ hardwareConcurrency: 12, deviceMemoryGb: 16, devicePixelRatio: 2, deviceType: 'desktop' })).toBe('high');
  });

  it('steps down only after three continuous slow seconds and never steps up', () => {
    const monitor = new FrameBudgetMonitor('high');
    for (let elapsed = 0; elapsed < 2960; elapsed += 40) expect(monitor.observe(40).changed).toBe(false);
    expect(monitor.observe(40)).toMatchObject({ changed: true, tier: 'medium' });
    expect(monitor.observe(16).tier).toBe('medium');
    expect(monitor.constrainTo('high')).toBe(false);
  });

  it('resets the slow window after one on-budget frame', () => {
    const monitor = new FrameBudgetMonitor('medium');
    for (let elapsed = 0; elapsed < 2000; elapsed += 40) monitor.observe(40);
    monitor.observe(16);
    for (let elapsed = 0; elapsed < 2000; elapsed += 40) monitor.observe(40);
    expect(monitor.tier).toBe('medium');
  });

  it('maps lower tiers to slower cosmetic terrain animation', () => {
    expect(lowerTier('high', 'low')).toBe('low');
    expect(terrainAnimationIntervalMs('low')).toBeGreaterThan(terrainAnimationIntervalMs('high'));
  });
});
