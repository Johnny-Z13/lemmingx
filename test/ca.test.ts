import { describe, expect, it } from 'vitest';
import { MATERIAL, Terrain } from '../src/sim/Terrain';
import { SeededRng } from '../src/sim/ca/SeededRng';
import { ChunkStepper } from '../src/sim/ca/ChunkStepper';
import { GameSimulation } from '../src/sim/GameSimulation';
import type { LevelDefinition } from '../src/sim/types';

function makeLevel(terrain: Terrain, overrides: Partial<LevelDefinition> = {}): LevelDefinition {
  return {
    width: terrain.width,
    height: terrain.height,
    spawn: { x: 20, y: 20 },
    exit: { x: 200, y: 0, width: 1, height: 1 },
    spawnIntervalMs: 1000,
    totalLemmings: 0,
    releaseRate: 50,
    minReleaseRate: 1,
    maxReleaseRate: 99,
    targetSaved: 1,
    hatchOpenMs: 0,
    caEnabled: true,
    caSeed: 42,
    caSubsteps: 4,
    skills: {
      climber: 0,
      floater: 0,
      bomber: 0,
      blocker: 0,
      builder: 0,
      basher: 0,
      miner: 0,
      digger: 0,
      swimmer: 0,
    },
    terrain,
    ...overrides,
  };
}

describe('SeededRng', () => {
  it('is deterministic for the same seed', () => {
    const a = new SeededRng(99);
    const b = new SeededRng(99);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });
});

describe('sand CA', () => {
  it('sand falls down onto a floor', () => {
    const terrain = new Terrain(80, 80, 4);
    terrain.fillRect(0, 60, 80, 20); // floor
    terrain.setCell(5, 2, MATERIAL.sand); // near top
    const ca = new ChunkStepper(terrain, new SeededRng(1));
    ca.settleUntilQuiet();
    expect(terrain.getCell(5, 2)).toBe(MATERIAL.empty);
    expect(terrain.getCell(5, 14)).toBe(MATERIAL.sand); // resting on floor at cell y=15 is dirt
  });

  it('identical seeds produce identical settle outcomes', () => {
    const build = () => {
      const terrain = new Terrain(64, 64, 4);
      terrain.fillRect(0, 48, 64, 16);
      for (let x = 2; x < 12; x += 1) terrain.setCell(x, 4, MATERIAL.sand);
      const ca = new ChunkStepper(terrain, new SeededRng(7));
      ca.settleUntilQuiet();
      return Array.from({ length: terrain.cols * terrain.rows }, (_, i) =>
        terrain.getCell(i % terrain.cols, Math.floor(i / terrain.cols)),
      );
    };
    expect(build()).toEqual(build());
  });

  it('water flows sideways on a floor', () => {
    const terrain = new Terrain(80, 40, 4);
    terrain.fillRect(0, 28, 80, 12);
    terrain.setCell(2, 6, MATERIAL.water);
    const ca = new ChunkStepper(terrain, new SeededRng(3));
    ca.settleUntilQuiet(800);
    // Water should leave the spawn column or spread.
    const waters: number[] = [];
    for (let x = 0; x < terrain.cols; x += 1) {
      if (terrain.getCell(x, 6) === MATERIAL.water || terrain.getCell(x, 6) === MATERIAL.water) waters.push(x);
      if (terrain.getCell(x, 5) === MATERIAL.water) waters.push(x);
    }
    let count = 0;
    for (let y = 0; y < terrain.rows; y += 1) {
      for (let x = 0; x < terrain.cols; x += 1) {
        if (terrain.getCell(x, y) === MATERIAL.water) count += 1;
      }
    }
    expect(count).toBe(1);
    expect(terrain.getCell(2, 6)).not.toBe(MATERIAL.water); // fell or moved
  });

  it('bomber crater leaves settling sand debris', () => {
    const terrain = new Terrain(120, 120, 4);
    terrain.fillRect(0, 72, 120, 48);
    const sim = new GameSimulation(
      makeLevel(terrain, {
        totalLemmings: 1,
        spawn: { x: 40, y: 56 },
        spawnIntervalMs: 10,
        sandEmitRatio: 1,
        skills: {
          climber: 0,
          floater: 0,
          bomber: 1,
          blocker: 0,
          builder: 0,
          basher: 0,
          miner: 0,
          digger: 0,
          swimmer: 0,
        },
      }),
    );
    sim.step(120);
    const lemming = sim.state.lemmings[0];
    sim.assignSkill(lemming.id, 'bomber');
    for (let i = 0; i < 400; i += 1) sim.step(16);
    sim.settleTerrain();
    let sand = 0;
    for (let y = 0; y < terrain.rows; y += 1) {
      for (let x = 0; x < terrain.cols; x += 1) {
        if (terrain.getCell(x, y) === MATERIAL.sand) sand += 1;
      }
    }
    expect(sand).toBeGreaterThan(0);
  });

  it('open water floats a lemming instead of drowning it', () => {
    const terrain = new Terrain(120, 80, 4);
    terrain.fillRect(0, 56, 120, 24);
    terrain.fillRect(40, 40, 40, 20, MATERIAL.water);
    const sim = new GameSimulation(
      makeLevel(terrain, {
        totalLemmings: 1,
        targetSaved: 1,
        spawn: { x: 20, y: 40 },
        spawnIntervalMs: 10,
        exit: { x: 200, y: 0, width: 1, height: 1 },
      }),
    );
    for (let i = 0; i < 400; i += 1) sim.step(16);
    expect(sim.state.lost).toBe(0);
  });

  it('stability collapses unsupported dirt into sand', () => {
    const terrain = new Terrain(40, 40, 4);
    terrain.fillRect(0, 32, 40, 8); // floor at cell rows 8–9
    terrain.setCell(5, 4, MATERIAL.dirt); // floating (in-bounds)
    const ca = new ChunkStepper(terrain, new SeededRng(1));
    ca.markAll();
    ca.step(1, 2);
    expect(terrain.getCell(5, 4)).toBe(MATERIAL.sand);
  });

  it('wood falls through air and rests on water (does not fly)', () => {
    const terrain = new Terrain(80, 80, 4);
    terrain.fillRect(0, 60, 80, 20);
    terrain.fillRect(0, 48, 80, 12, MATERIAL.water);
    terrain.setCell(5, 2, MATERIAL.wood);
    const ca = new ChunkStepper(terrain, new SeededRng(1));
    ca.settleUntilQuiet();
    expect(terrain.getCell(5, 2)).toBe(MATERIAL.empty);
    // Wood should sit on the water surface, not keep rising into the sky.
    expect(terrain.getCell(5, 11)).toBe(MATERIAL.wood);
    expect(terrain.getCell(5, 12)).toBe(MATERIAL.water);
  });

  it('adjacent water seeps under wood and lifts it', () => {
    const terrain = new Terrain(80, 80, 4);
    terrain.fillRect(0, 60, 80, 20); // floor
    terrain.setCell(5, 14, MATERIAL.wood); // on floor
    terrain.setCell(4, 14, MATERIAL.water); // beside
    const ca = new ChunkStepper(terrain, new SeededRng(2));
    ca.markAll();
    for (let i = 0; i < 40; i += 1) ca.step(1);
    // Wood should have risen; water under where it was.
    expect(terrain.getCell(5, 14)).not.toBe(MATERIAL.wood);
    let woodY = -1;
    for (let y = 0; y < terrain.rows; y += 1) {
      if (terrain.getCell(5, y) === MATERIAL.wood) woodY = y;
    }
    expect(woodY).toBeGreaterThanOrEqual(0);
    expect(woodY).toBeLessThan(14);
  });
});

describe('hatch release queue', () => {
  it('queues a digger and applies it once grounded', () => {
    const terrain = new Terrain(200, 120, 4);
    terrain.fillRect(0, 80, 200, 40);
    const sim = new GameSimulation(
      makeLevel(terrain, {
        totalLemmings: 2,
        spawn: { x: 40, y: 64 },
        spawnIntervalMs: 10,
        hatchOpenMs: 0,
        skills: {
          climber: 0,
          floater: 0,
          bomber: 0,
          blocker: 0,
          builder: 0,
          basher: 0,
          miner: 0,
          digger: 2,
          swimmer: 0,
        },
      }),
    );
    expect(sim.enqueueRelease('digger')).toBe(true);
    expect(sim.state.hatchQueue).toEqual(['digger']);
    expect(sim.state.skills.digger).toBe(1);
    for (let i = 0; i < 80; i += 1) sim.step(16);
    const worker = sim.state.lemmings.find((l) => l.state === 'digger');
    expect(worker).toBeTruthy();
    expect(sim.state.hatchQueue).toHaveLength(0);
  });

  it('popReleaseQueue refunds the skill', () => {
    const terrain = new Terrain(120, 80, 4);
    terrain.fillRect(0, 56, 120, 24);
    const sim = new GameSimulation(
      makeLevel(terrain, {
        totalLemmings: 3,
        skills: {
          climber: 0,
          floater: 0,
          bomber: 0,
          blocker: 0,
          builder: 0,
          basher: 0,
          miner: 0,
          digger: 2,
          swimmer: 0,
        },
      }),
    );
    sim.enqueueRelease('digger');
    expect(sim.popReleaseQueue()).toBe(true);
    expect(sim.state.skills.digger).toBe(2);
    expect(sim.state.hatchQueue).toHaveLength(0);
  });
});
