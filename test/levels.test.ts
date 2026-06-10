import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/sim/GameSimulation';
import { createLevelAt, LEVEL_COUNT } from '../src/levels';
import type { Lemming } from '../src/sim/types';

/**
 * Solvability guards. Each level ships with a known scripted solution; if a sim
 * change ever breaks a level's intended route, these fail loudly. The scripts
 * mirror the human solution described in each level file.
 */

const MAX_STEPS = 16000;
const STEP_MS = 16;

function run(levelIndex: number, strategy: (sim: GameSimulation) => void): GameSimulation {
  const sim = new GameSimulation(createLevelAt(levelIndex));
  for (let s = 0; s < MAX_STEPS && sim.state.outcome === 'running'; s += 1) {
    sim.step(STEP_MS);
    strategy(sim);
  }
  return sim;
}

describe('Level roster', () => {
  it('exposes the expected number of levels', () => {
    expect(LEVEL_COUNT).toBeGreaterThanOrEqual(3);
  });

  it('level 1 is solvable by bashing through the wall', () => {
    const sim = run(0, (s) => {
      for (const l of s.state.lemmings) {
        // Bash when up against the wall heading right.
        if (l.state === 'walker' && l.direction === 1 && l.x > 540 && l.x < 560) {
          s.assignSkill(l.id, 'basher');
        }
      }
    });
    expect(sim.state.outcome).toBe('won');
    expect(sim.state.saved).toBeGreaterThanOrEqual(sim.level.targetSaved);
  });

  it('level 2 is solvable by bashing the wall then floating down', () => {
    const floated = new Set<number>();
    const sim = run(1, (s) => {
      for (const l of s.state.lemmings) {
        if (l.state === 'walker' && l.direction === 1 && l.x >= 350 && l.x < 362 && l.y < 240) {
          s.assignSkill(l.id, 'basher');
        }
        if (!floated.has(l.id) && (l.state === 'walker' || l.state === 'faller') && l.x > 412 && l.y < 250) {
          if (s.assignSkill(l.id, 'floater')) floated.add(l.id);
        }
      }
    });
    expect(sim.state.outcome).toBe('won');
    expect(sim.state.saved).toBeGreaterThanOrEqual(sim.level.targetSaved);
  });

  it('level 3 is solvable by climbing the wall then floating down', () => {
    const climbed = new Set<number>();
    const floated = new Set<number>();
    const sim = run(2, (s) => {
      for (const l of s.state.lemmings as Lemming[]) {
        if (!climbed.has(l.id) && l.state === 'walker' && l.x < 140) {
          if (s.assignSkill(l.id, 'climber')) climbed.add(l.id);
        }
        if (!floated.has(l.id) && (l.state === 'walker' || l.state === 'faller') && l.x > 740 && l.y < 210) {
          if (s.assignSkill(l.id, 'floater')) floated.add(l.id);
        }
      }
    });
    expect(sim.state.outcome).toBe('won');
    expect(sim.state.saved).toBeGreaterThanOrEqual(sim.level.targetSaved);
  });
});
