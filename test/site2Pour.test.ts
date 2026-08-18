import { describe, expect, it } from 'vitest';
import { SITE2_POUR_ZONES, site2PourZoneAt } from '../src/onboarding/site2Pour';
import { createLevel2 } from '../src/levels/level2';
import { GameSimulation } from '../src/sim/GameSimulation';

describe('Site 2 pour targets', () => {
  it('provides two broad, non-overlapping choices with different outcomes', () => {
    expect(SITE2_POUR_ZONES).toHaveLength(2);
    const [quick, high] = SITE2_POUR_ZONES;
    expect(site2PourZoneAt(quick.x + quick.width / 2, quick.y + quick.height / 2)?.id).toBe('quick-lift');
    expect(site2PourZoneAt(high.x + high.width / 2, high.y + high.height / 2)?.id).toBe('high-water');
    expect(quick.paintRadius).not.toBe(high.paintRadius);
    expect(quick.width).toBeGreaterThanOrEqual(44);
    expect(high.width).toBeGreaterThanOrEqual(44);
  });

  it('rejects imprecise painting outside the authored lock without consuming a choice', () => {
    expect(site2PourZoneAt(420, 430)).toBeNull();
    expect(site2PourZoneAt(540, 430)).toBeNull();
    expect(site2PourZoneAt(470, 410)).toBeNull();
  });

  for (const zone of SITE2_POUR_ZONES) {
    it(`${zone.label} creates a solvable hydraulic crossing from one clear choice`, () => {
      const sim = new GameSimulation(createLevel2());
      expect(sim.paintLandscape(
        zone.x + zone.width / 2,
        zone.y + zone.height / 2,
        zone.paintRadius,
        'water',
      )).toBe(true);
      for (let i = 0; i < 20000 && sim.state.outcome === 'running'; i += 1) sim.step(16);
      expect(sim.state.outcome).toBe('won');
      expect(sim.state.saved).toBeGreaterThanOrEqual(sim.state.targetSaved);
    });
  }
});
