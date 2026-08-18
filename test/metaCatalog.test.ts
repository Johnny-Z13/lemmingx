import { describe, expect, it } from 'vitest';
import { createLevelAt } from '../src/levels';
import {
  ATLAS_ENTRIES,
  DAILY_BASE_SITES,
  DAILY_RESCUES,
  WORKSHOP_PROJECTS,
  dailyForUtcDate,
  validateEconomyPath,
} from '../src/meta/catalog';

describe('Basic Launch meta catalog', () => {
  it('ships six projects, fourteen visible Atlas gaps, and the locked cost curve', () => {
    expect(WORKSHOP_PROJECTS.map(({ cost }) => cost)).toEqual([18, 18, 20, 22, 24, 24]);
    expect(new Set(WORKSHOP_PROJECTS.map(({ id }) => id)).size).toBe(6);
    expect(ATLAS_ENTRIES).toHaveLength(14);
    expect(new Set(ATLAS_ENTRIES.map(({ id }) => id)).size).toBe(14);
  });

  it('contains 21 disclosed authored Daily configurations with three real goals per base', () => {
    expect(DAILY_RESCUES).toHaveLength(21);
    expect(new Set(DAILY_RESCUES.map(({ id }) => id)).size).toBe(21);
    expect(DAILY_BASE_SITES).toEqual([0, 1, 2, 3, 4, 6, 7]);
    for (const baseSite of DAILY_BASE_SITES) {
      const variants = DAILY_RESCUES.filter((daily) => daily.baseSite === baseSite);
      expect(variants.map(({ variant }) => variant)).toEqual(['rescue', 'perfect', 'rush']);
      const level = createLevelAt(baseSite);
      expect(level.targetSaved).toBeGreaterThan(0);
      expect(level.targetSaved).toBeLessThanOrEqual(level.totalLemmings);
    }
  });

  it('selects the same Daily from a UTC date without a backend', () => {
    expect(dailyForUtcDate('2026-08-18')).toEqual(dailyForUtcDate('2026-08-18'));
    const ids = Array.from({ length: 21 }, (_, offset) => {
      const date = new Date(Date.UTC(2026, 7, 18 + offset)).toISOString().slice(0, 10);
      return dailyForUtcDate(date).id;
    });
    expect(new Set(ids).size).toBe(21);
  });

  it('keeps active play stronger than away production across launch paths', () => {
    const minimumFirstExpedition = validateEconomyPath({
      campaignSalvage: 19,
      atlasSalvage: 4,
      dailySalvage: 0,
      awaySalvage: 0,
    });
    expect(minimumFirstExpedition.firstChoiceReachable).toBe(true);
    expect(minimumFirstExpedition.awayDominant).toBe(false);

    const oneDaily = validateEconomyPath({ campaignSalvage: 0, atlasSalvage: 0, dailySalvage: 24, awaySalvage: 0 });
    expect(oneDaily.firstChoiceReachable).toBe(true);
    const cappedReturn = validateEconomyPath({ campaignSalvage: 19, atlasSalvage: 0, dailySalvage: 0, awaySalvage: 4 });
    expect(cappedReturn.awayDominant).toBe(false);
  });
});
