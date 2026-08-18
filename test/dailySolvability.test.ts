import { describe, expect, it } from 'vitest';
import { createLevelAt } from '../src/levels';
import { DAILY_RESCUES, type DailyVariant } from '../src/meta/catalog';
import { configureDailyLevel } from '../src/meta/dailyRules';
import { SITE2_POUR_ZONES } from '../src/onboarding/site2Pour';
import { GameSimulation } from '../src/sim/GameSimulation';

const STEP_MS = 16;
const MAX_STEPS = 22_000;

function runDaily(baseSite: number, variant: DailyVariant): GameSimulation {
  const definition = DAILY_RESCUES.find((daily) => daily.baseSite === baseSite && daily.variant === variant)!;
  const sim = new GameSimulation(configureDailyLevel(createLevelAt(baseSite), definition));
  let actionA = false;
  let actionB = false;
  let actionC = false;
  let count = 0;
  let blockerId: number | null = null;
  let actionAt = 0;

  if (baseSite === 1) {
    const zone = SITE2_POUR_ZONES[0];
    expect(sim.paintLandscape(zone.x + zone.width / 2, zone.y + zone.height / 2, zone.paintRadius, 'water')).toBe(true);
  }
  if (baseSite === 6) {
    expect(sim.paintLandscape(520, 344, 16, 'fire')).toBe(true);
    expect(sim.paintLandscape(684, 344, 16, 'fire')).toBe(true);
    for (let step = 0; step < 500; step += 1) sim.stepLivingTerrain();
  }

  for (let step = 0; step < MAX_STEPS && sim.state.outcome === 'running'; step += 1) {
    sim.step(STEP_MS);
    for (const crew of sim.state.lemmings) {
      if (baseSite === 0 && !actionA && crew.state === 'walker' && crew.direction === 1 && crew.x > 286 && crew.x < 300) {
        actionA = sim.assignSkill(crew.id, 'basher');
      }
      if (baseSite === 2 && variant !== 'perfect' && !actionA && crew.state === 'walker' && crew.direction === 1 && crew.x > 548 && crew.x < 554) {
        if (sim.assignSkill(crew.id, 'blocker')) actionA = sim.assignSkill(crew.id, 'bomber');
      }
      if (baseSite === 2 && variant === 'perfect' && blockerId === null && crew.state === 'walker' && crew.direction === 1 && crew.x > 520 && crew.x < 530) {
        if (sim.assignSkill(crew.id, 'blocker')) {
          blockerId = crew.id;
          actionAt = sim.state.timeMs;
        }
      }
      if (baseSite === 3) {
        const walls = [800, 1600, 2400];
        const flags = [actionA, actionB, actionC];
        walls.forEach((wall, index) => {
          if (!flags[index] && crew.state === 'walker' && crew.direction === 1 && crew.x > wall - 16 && crew.x < wall - 2) {
            const assigned = sim.assignSkill(crew.id, 'basher');
            if (index === 0) actionA = assigned;
            if (index === 1) actionB = assigned;
            if (index === 2) actionC = assigned;
          }
        });
      }
      if (baseSite === 4 && !actionA && crew.state === 'walker' && crew.x > 600 && crew.x < 640) {
        actionA = sim.assignSkill(crew.id, 'digger');
      }
      if (baseSite === 7 && !actionA && crew.state === 'walker' && crew.direction === 1 && crew.x > 420 && crew.x < 470 && crew.y > 190) {
        actionA = sim.assignSkill(crew.id, 'miner');
      }
    }

    if (baseSite === 2 && variant === 'perfect' && blockerId !== null) {
      if (count < 3 && sim.state.timeMs > actionAt + 200 + count * 400) {
        if (sim.paintLandscape(564, 392, 16, 'sand')) count += 1;
      }
      if (count === 3 && !actionB && sim.state.timeMs > actionAt + 1800) {
        actionB = sim.assignSkill(blockerId, 'blocker');
      }
    }
  }
  return sim;
}

describe('Daily Rescue solver certificates', () => {
  for (const daily of DAILY_RESCUES) {
    it(`${daily.id} ${daily.title}`, () => {
      const sim = runDaily(daily.baseSite, daily.variant);
      expect(sim.state.outcome).toBe('won');
      expect(sim.state.saved).toBeGreaterThanOrEqual(sim.level.targetSaved);
      if (daily.variant === 'perfect') expect(sim.state.lost).toBe(0);
      if (daily.variant === 'rush') expect(sim.state.timeMs).toBeLessThanOrEqual(120_000);
    });
  }
});
