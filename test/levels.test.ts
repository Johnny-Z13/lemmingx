import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/sim/GameSimulation';
import { createLevelAt, LEVEL_COUNT, PROTOTYPE_LEVEL_INDICES, SAND_LAB_INDEX } from '../src/levels';
import { MATERIAL } from '../src/sim/Terrain';

/**
 * Solvability guards. Each level ships with a known scripted solution; if a sim
 * change ever breaks a level's intended route, these fail loudly. The scripts
 * mirror the human solution described in each level file.
 */

const MAX_STEPS = 22000;
const STEP_MS = 16;
const canonicalCases: Array<{ levelIndex: number; levelName: string }> = [];

function solvabilityIt(
  levelIndex: number,
  levelName: string,
  route: string,
  test: () => void,
): void {
  canonicalCases.push({ levelIndex, levelName });
  it(`level ${levelIndex + 1} (${levelName}) — ${route}`, test);
}

function run(
  levelIndex: number,
  strategy: (sim: GameSimulation) => void,
  setup?: (sim: GameSimulation) => void,
): GameSimulation {
  const sim = new GameSimulation(createLevelAt(levelIndex));
  setup?.(sim);
  for (let s = 0; s < MAX_STEPS && sim.state.outcome === 'running'; s += 1) {
    sim.step(STEP_MS);
    strategy(sim);
  }
  return sim;
}

function expectWon(sim: GameSimulation): void {
  expect(sim.state.outcome).toBe('won');
  expect(sim.state.saved).toBeGreaterThanOrEqual(sim.level.targetSaved);
  expect(sim.state.timeRemainingMs).toBeGreaterThan(0);
}

function waterCellCount(levelIndex: number): number {
  let count = 0;
  createLevelAt(levelIndex).terrain.forEachSolidCell((_x, _y, _width, _height, material) => {
    if (material === MATERIAL.water) count += 1;
  });
  return count;
}

describe('Level roster', () => {
  it('exposes the expected number of levels', () => {
    expect(LEVEL_COUNT).toBe(10);
  });

  it('keeps two numbered prototype slots outside campaign progression', () => {
    expect(PROTOTYPE_LEVEL_INDICES).toEqual([10, 11]);
    expect(SAND_LAB_INDEX).toBe(12);

    const dropZone = createLevelAt(PROTOTYPE_LEVEL_INDICES[0]);
    expect(dropZone.name).toBe('Drop Zone');
    expect(dropZone.playMode).toEqual({ spawn: 'tray-drop', goal: 'free-play' });
    expect(dropZone.openToolbox).toBe(true);

    const worldKit = createLevelAt(PROTOTYPE_LEVEL_INDICES[1]);
    expect(worldKit.name).toBe('World Kit');
    expect(worldKit.playMode).toEqual({
      spawn: 'automatic-hatch',
      goal: 'free-play',
      worldTools: ['hatch', 'exit'],
    });
    expect(worldKit.openToolbox).toBe(true);
  });

  it('prototype 11 accepts direct crew placement without resolving a quota', () => {
    const sim = new GameSimulation(createLevelAt(PROTOTYPE_LEVEL_INDICES[0]));
    expect(sim.placeLemming(100, 140, 'floater')).toBe(true);
    for (let i = 0; i < 500; i += 1) sim.step(STEP_MS);

    expect(sim.state.spawned).toBe(1);
    expect(sim.state.lemmings[0].isFloater).toBe(true);
    expect(sim.state.outcome).toBe('running');
  });

  it('prototype 12 releases the queued role from a moved hatch', () => {
    const sim = new GameSimulation(createLevelAt(PROTOTYPE_LEVEL_INDICES[1]));
    expect(sim.placeWorldEntity('hatch', 520, 380)).toBe(true);
    expect(sim.placeWorldEntity('exit', 870, 220)).toBe(true);
    expect(sim.enqueueRelease('climber')).toBe(true);

    for (let i = 0; i < 200 && sim.state.spawned === 0; i += 1) sim.step(STEP_MS);
    const spawn = sim.drainEvents().find((event) => event.kind === 'spawn');
    expect(spawn).toEqual({ kind: 'spawn', x: 520, y: 380 });
    expect(sim.state.lemmings[0].isClimber).toBe(true);
    expect(sim.state.outcome).toBe('running');
  });

  it('ships three locked-loadout challenges and player-facing briefings throughout', () => {
    const lockedLoadouts = new Set([1, 6, 8]);
    for (let index = 0; index < LEVEL_COUNT; index += 1) {
      const level = createLevelAt(index);
      expect(level.openToolbox).toBe(!lockedLoadouts.has(index));
      expect(level.objective?.length).toBeGreaterThan(20);
      expect(level.hint?.length).toBeGreaterThan(20);
      expect(level.spawn.x).toBeGreaterThanOrEqual(0);
      expect(level.spawn.x).toBeLessThan(level.width);
      expect(level.spawn.y).toBeGreaterThanOrEqual(0);
      expect(level.spawn.y).toBeLessThan(level.height);
      expect(level.exit.x).toBeGreaterThanOrEqual(0);
      expect(level.exit.x + level.exit.width).toBeLessThanOrEqual(level.width);
      expect(level.exit.y).toBeGreaterThanOrEqual(0);
      expect(level.exit.y + level.exit.height).toBeLessThanOrEqual(level.height);
      expect(level.targetSaved).toBeGreaterThan(0);
      expect(level.targetSaved).toBeLessThanOrEqual(level.totalLemmings);
    }
  });

  it('registers exactly one canonical solvability script per campaign level', () => {
    expect(canonicalCases.map(({ levelIndex }) => levelIndex)).toEqual(
      Array.from({ length: LEVEL_COUNT }, (_, index) => index),
    );
    for (const { levelIndex, levelName } of canonicalCases) {
      expect(createLevelAt(levelIndex).name).toBe(levelName);
    }
  });

  it('authors substantial water bodies into at least half of the campaign', () => {
    const waterLevels = Array.from({ length: LEVEL_COUNT }, (_, index) => ({
      index,
      cells: waterCellCount(index),
    })).filter(({ cells }) => cells >= 50);
    expect(waterLevels.map(({ index }) => index)).toEqual(expect.arrayContaining([1, 3, 5, 6, 9]));
    expect(waterLevels.length).toBeGreaterThanOrEqual(Math.ceil(LEVEL_COUNT / 2));
  });

  solvabilityIt(0, 'First Steps', 'bash through the wall', () => {
    let bashed = false;
    const sim = run(0, (s) => {
      for (const l of s.state.lemmings) {
        if (!bashed && l.state === 'walker' && l.direction === 1 && l.x > 544 && l.x < 556) {
          bashed = s.assignSkill(l.id, 'basher');
        }
      }
    });
    expectWon(sim);
  });

  solvabilityIt(1, 'The Deep End', 'swimmers cross the deep pool', () => {
    const sim = run(1, (s) => {
      for (const l of s.state.lemmings) {
        if (!l.isSwimmer && l.state !== 'dead' && l.state !== 'exited') s.assignSkill(l.id, 'swimmer');
      }
    });
    expectWon(sim);
    expect(sim.state.lemmings.filter((l) => l.state === 'exited').every((l) => l.isSwimmer)).toBe(true);
  });

  it('level 2 (The Deep End) — cannot meet quota without swimmers', () => {
    const sim = run(1, () => {});
    expect(sim.state.outcome).toBe('lost');
    expect(sim.state.saved).toBeLessThan(sim.level.targetSaved);
  });

  solvabilityIt(2, 'Hold the Line', 'a blocker-bomber at the wall face breaches it', () => {
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

  it('level 3 (Hold the Line) — sand charges ramp the wall, no lives spent', () => {
    let poured = 0;
    const sim = run(2, (s) => {
      if (poured < 3 && s.state.timeMs > 1200 + poured * 400) {
        if (s.paintLandscape(564, 392, 16, 'sand')) poured += 1;
      }
    });
    expectWon(sim);
    expect(sim.state.lost).toBe(0);
  });

  solvabilityIt(3, 'The Long March', 'bash all three walls and wade the marsh', () => {
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

  solvabilityIt(4, 'Steel Yourself', 'dig west of the steel cap and walk under it', () => {
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

  solvabilityIt(5, 'Trap House', 'rush the traps across the reservoir catwalk', () => {
    const sim = run(5, () => {});
    expectWon(sim);
    expect(sim.state.lost).toBeGreaterThanOrEqual(1); // the traps took someone
  });

  it('level 6 (Trap House) — bury the crusher in sand and walk over it', () => {
    // Two pours each side of the trigger merge into a wide berm — a single
    // centred pyramid leaves its east slope inside the kill zone.
    let poured = 0;
    const sim = run(5, (s) => {
      if (poured < 4 && s.state.timeMs > 1000 + poured * 400) {
        if (s.paintLandscape(poured % 2 === 0 ? 498 : 516, 408, 16, 'sand')) poured += 1;
      }
    });
    expectWon(sim);
    expect(poured).toBe(4);
    // The zapper and chomper may still take one victim each; the buried
    // crusher must not — the bare mob-rush route loses three.
    expect(sim.state.lost).toBeLessThanOrEqual(2);
  });

  solvabilityIt(6, 'Trial by Fire', 'pre-burn both timber obstacles before release', () => {
    const sim = run(6, () => {}, (s) => {
      expect(s.paintLandscape(520, 344, 16, 'fire')).toBe(true);
      expect(s.paintLandscape(684, 344, 16, 'fire')).toBe(true);
      for (let i = 0; i < 500; i += 1) s.stepLivingTerrain();
    });
    expectWon(sim);
    expect(sim.state.landscape.fire).toBe(0);
  });

  it('level 7 (Trial by Fire) — the intact timber door blocks the quota', () => {
    const sim = run(6, () => {});
    expect(sim.state.outcome).toBe('lost');
    expect(sim.state.saved).toBe(0);
  });

  solvabilityIt(7, 'Down and Out', 'one miner tunnels the mountain and the crew follows', () => {
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

  solvabilityIt(8, 'The Gauntlet', 'floater and climber traits carry everyone through', () => {
    const sim = run(8, (s) => {
      for (const l of s.state.lemmings) {
        if (l.state === 'walker' && l.x < 440 && l.y < 200) {
          if (!l.isFloater) s.assignSkill(l.id, 'floater');
          if (!l.isClimber) s.assignSkill(l.id, 'climber');
        }
      }
    });
    expectWon(sim);
    expect(
      sim.state.lemmings
        .filter((l) => l.state === 'exited')
        .every((l) => l.isFloater && l.isClimber),
    ).toBe(true);
  });

  it('level 9 (The Gauntlet) — the sheer drop is fatal without floaters', () => {
    const sim = run(8, () => {});
    expect(sim.state.outcome).toBe('lost');
    expect(sim.state.saved).toBe(0);
    expect(sim.state.lost).toBe(sim.level.totalLemmings);
  });

  solvabilityIt(9, 'Sandworld Symphony', 'chain the full toolkit', () => {
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
