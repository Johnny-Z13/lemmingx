import { describe, expect, it } from 'vitest';
import { MATERIAL, Terrain } from '../src/sim/Terrain';
import { GameSimulation } from '../src/sim/GameSimulation';
import type { EmitterDefinition, LevelDefinition } from '../src/sim/types';
import { createLevelAt } from '../src/levels';

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
    // Free-play outcome rules: with zero lemmings a quota level is 'lost' on
    // the first step, which would freeze the sim before anything emits.
    sandLab: true,
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

function countMaterial(terrain: Terrain, material: number): number {
  let count = 0;
  for (let y = 0; y < terrain.rows; y += 1) {
    for (let x = 0; x < terrain.cols; x += 1) {
      if (terrain.getCell(x, y) === material) count += 1;
    }
  }
  return count;
}

describe('material emitters', () => {
  it('pours sand until the budget is exhausted', () => {
    const terrain = new Terrain(120, 120, 4);
    terrain.fillRect(0, 100, 120, 20); // floor
    const emitter: EmitterDefinition = { x: 60, y: 20, material: 'sand', cellsPerSecond: 20, budget: 6 };
    const sim = new GameSimulation(makeLevel(terrain, { emitters: [emitter] }));
    for (let s = 0; s < 200; s += 1) sim.step(16);
    sim.settleTerrain();
    expect(sim.state.emitters[0].budgetLeft).toBe(0);
    expect(countMaterial(terrain, MATERIAL.sand)).toBe(6);
  });

  it('a blocked spout emits nothing and burns no budget', () => {
    const terrain = new Terrain(120, 120, 4);
    terrain.fillRect(0, 100, 120, 20);
    terrain.fillRect(56, 16, 8, 8, MATERIAL.steel); // plug the spout cell
    const emitter: EmitterDefinition = { x: 60, y: 20, material: 'sand', cellsPerSecond: 20, budget: 6 };
    const sim = new GameSimulation(makeLevel(terrain, { emitters: [emitter] }));
    for (let s = 0; s < 100; s += 1) sim.step(16);
    expect(sim.state.emitters[0].budgetLeft).toBe(6);
    expect(countMaterial(terrain, MATERIAL.sand)).toBe(0);
  });

  it('water emitters pour water', () => {
    const terrain = new Terrain(120, 120, 4);
    terrain.fillRect(0, 100, 120, 20);
    const emitter: EmitterDefinition = { x: 60, y: 20, material: 'water', cellsPerSecond: 20, budget: 5 };
    const sim = new GameSimulation(makeLevel(terrain, { emitters: [emitter] }));
    for (let s = 0; s < 200; s += 1) sim.step(16);
    expect(sim.state.emitters[0].budgetLeft).toBe(0);
    expect(countMaterial(terrain, MATERIAL.water)).toBe(5);
  });

  it('level 6 gradually raises its protected reservoir from the water spout', () => {
    const sim = new GameSimulation(createLevelAt(5));
    const before = countMaterial(sim.level.terrain, MATERIAL.water);
    const emitter = sim.state.emitters[0];
    expect(sim.level.terrain.materialAt(emitter.def.x, emitter.def.y)).toBe(MATERIAL.empty);

    for (let s = 0; s < 500; s += 1) sim.step(16); // 8 seconds of the 20-second fill

    const after = countMaterial(sim.level.terrain, MATERIAL.water);
    expect(sim.state.emitters[0].def.material).toBe('water');
    expect(sim.state.emitters[0].budgetLeft).toBeGreaterThan(0);
    expect(sim.state.emitters[0].budgetLeft).toBeLessThan(90);
    expect(after).toBeGreaterThan(before);
  });

  it('same level and seed produce identical terrain after emission', () => {
    const build = () => {
      const terrain = new Terrain(120, 120, 4);
      terrain.fillRect(0, 100, 120, 20);
      const emitter: EmitterDefinition = { x: 60, y: 20, material: 'sand', cellsPerSecond: 20, budget: 12 };
      const sim = new GameSimulation(makeLevel(terrain, { emitters: [emitter] }));
      for (let s = 0; s < 300; s += 1) sim.step(16);
      return Array.from({ length: terrain.cols * terrain.rows }, (_, i) =>
        terrain.getCell(i % terrain.cols, Math.floor(i / terrain.cols)),
      );
    };
    expect(build()).toEqual(build());
  });
});
