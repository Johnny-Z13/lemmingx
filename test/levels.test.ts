import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/sim/GameSimulation';
import { createLevelAt, LEVEL_COUNT } from '../src/levels';

/**
 * Solvability guards. Each level ships with a known scripted solution; if a sim
 * change ever breaks a level's intended route, these fail loudly. The scripts
 * mirror the human solution described in each level file.
 */

const MAX_STEPS = 22000;
const STEP_MS = 16;

function run(levelIndex: number, strategy: (sim: GameSimulation) => void): GameSimulation {
  const sim = new GameSimulation(createLevelAt(levelIndex));
  for (let s = 0; s < MAX_STEPS && sim.state.outcome === 'running'; s += 1) {
    sim.step(STEP_MS);
    strategy(sim);
  }
  return sim;
}

function expectWon(sim: GameSimulation): void {
  expect(sim.state.outcome).toBe('won');
  expect(sim.state.saved).toBeGreaterThanOrEqual(sim.level.targetSaved);
}

describe('Level roster', () => {
  it('exposes the expected number of levels', () => {
    expect(LEVEL_COUNT).toBe(10);
  });

  it('level 1 (First Steps) — bash through the wall', () => {
    const sim = run(0, (s) => {
      for (const l of s.state.lemmings) {
        if (l.state === 'walker' && l.direction === 1 && l.x > 544 && l.x < 556) {
          s.assignSkill(l.id, 'basher');
        }
      }
    });
    expectWon(sim);
  });

  it('level 2 (Bridge the Gap) — two chained builders over the water', () => {
    let bridge1 = false;
    let bridge2 = false;
    const sim = run(1, (s) => {
      for (const l of s.state.lemmings) {
        if (!bridge1 && l.state === 'walker' && l.direction === 1 && l.x > 378 && l.x < 392) {
          bridge1 = s.assignSkill(l.id, 'builder');
        }
        if (bridge1 && !bridge2 && l.state === 'walker' && l.direction === 1 && l.x > 424 && l.x < 438 && l.y < 424) {
          bridge2 = s.assignSkill(l.id, 'builder');
        }
      }
    });
    expectWon(sim);
  });

  it('level 3 (Hold the Line) — a blocker-bomber at the wall face breaches it', () => {
    let blasted = false;
    const sim = run(2, (s) => {
      for (const l of s.state.lemmings) {
        if (!blasted && l.state === 'walker' && l.direction === 1 && l.x > 548 && l.x < 554) {
          if (s.assignSkill(l.id, 'blocker')) {
            s.assignSkill(l.id, 'bomber');
            blasted = true;
          }
        }
      }
    });
    expectWon(sim);
    expect(sim.state.lost).toBeGreaterThanOrEqual(1); // the volunteer
  });

  it('level 4 (The Long March) — bash all three walls', () => {
    const bashed = [false, false, false];
    const walls = [800, 1600, 2400];
    const sim = run(3, (s) => {
      for (const l of s.state.lemmings) {
        walls.forEach((wall, i) => {
          if (!bashed[i] && l.state === 'walker' && l.direction === 1 && l.x > wall - 16 && l.x < wall - 2) {
            bashed[i] = s.assignSkill(l.id, 'basher');
          }
        });
      }
    });
    expectWon(sim);
  });

  it('level 5 (Steel Yourself) — dig west of the steel cap, walk under it', () => {
    let dug = false;
    const sim = run(4, (s) => {
      for (const l of s.state.lemmings) {
        if (!dug && l.state === 'walker' && l.x > 600 && l.x < 640) {
          dug = s.assignSkill(l.id, 'digger');
        }
      }
    });
    expectWon(sim);
  });

  it('level 6 (Trap House) — the mob rushes the traps, one victim each', () => {
    const sim = run(5, () => {});
    expectWon(sim);
    expect(sim.state.lost).toBeGreaterThanOrEqual(1); // the traps took someone
  });

  it('level 7 (Wrong Way) — bash the with-arrow wall, climb the against-arrow wall', () => {
    let bashed = false;
    const sim = run(6, (s) => {
      for (const l of s.state.lemmings) {
        if (!bashed && l.state === 'walker' && l.direction === 1 && l.x > 584 && l.x < 596) {
          bashed = s.assignSkill(l.id, 'basher');
        }
        if (l.state === 'walker' && l.direction === 1 && !l.isClimber && l.x > 700 && l.x < 980) {
          s.assignSkill(l.id, 'climber');
        }
      }
    });
    expectWon(sim);
  });

  it('level 8 (Down and Out) — one miner tunnels the mountain, the crew follows', () => {
    let mined = false;
    const sim = run(7, (s) => {
      for (const l of s.state.lemmings) {
        if (!mined && l.state === 'walker' && l.direction === 1 && l.x > 420 && l.x < 470 && l.y > 190) {
          mined = s.assignSkill(l.id, 'miner');
        }
      }
    });
    expectWon(sim);
  });

  it('level 9 (The Gauntlet) — floater+climber traits carry everyone through', () => {
    const sim = run(8, (s) => {
      for (const l of s.state.lemmings) {
        if (l.state === 'walker' && l.x < 440 && l.y < 200) {
          if (!l.isFloater) s.assignSkill(l.id, 'floater');
          if (!l.isClimber) s.assignSkill(l.id, 'climber');
        }
      }
    });
    expectWon(sim);
  });

  it('level 10 (Last Lemming Standing) — the full toolkit chained', () => {
    let bashA = false;
    let bridge1 = false;
    let bridge2 = false;
    let bashB = false;
    let dug = false;
    const sim = run(9, (s) => {
      for (const l of s.state.lemmings) {
        if (!bashA && l.state === 'walker' && l.direction === 1 && l.x > 744 && l.x < 756) {
          bashA = s.assignSkill(l.id, 'basher');
        }
        if (!bridge1 && l.state === 'walker' && l.direction === 1 && l.x > 1000 && l.x < 1018) {
          bridge1 = s.assignSkill(l.id, 'builder');
        }
        if (bridge1 && !bridge2 && l.state === 'walker' && l.direction === 1 && l.x > 1044 && l.x < 1062 && l.y < 426) {
          bridge2 = s.assignSkill(l.id, 'builder');
        }
        if (!bashB && l.state === 'walker' && l.direction === 1 && l.x > 1584 && l.x < 1596) {
          bashB = s.assignSkill(l.id, 'basher');
        }
        if (!dug && l.state === 'walker' && l.x > 2290 && l.x < 2330) {
          dug = s.assignSkill(l.id, 'digger');
        }
      }
    });
    expectWon(sim);
  });
});
