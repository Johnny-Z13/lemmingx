import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/sim/GameSimulation';
import { Terrain } from '../src/sim/Terrain';
import type { LevelDefinition } from '../src/sim/types';

function makeFlatLevel(overrides: Partial<LevelDefinition> = {}): LevelDefinition {
  const terrain = new Terrain(240, 120, 4);
  terrain.fillRect(0, 88, 240, 32);

  return {
    width: 240,
    height: 120,
    spawn: { x: 24, y: 72 },
    exit: { x: 205, y: 72, width: 18, height: 24 },
    spawnIntervalMs: 100,
    totalLemmings: 1,
    releaseRate: 50,
    minReleaseRate: 1,
    maxReleaseRate: 99,
    targetSaved: 1,
    skills: {
      blocker: 10,
      builder: 10,
      digger: 10,
    },
    terrain,
    ...overrides,
  };
}

describe('Terrain', () => {
  it('can remove solid cells from a mutable landscape', () => {
    const terrain = new Terrain(80, 80, 4);
    terrain.fillRect(0, 40, 80, 40);
    const before = terrain.solidCellCount();

    terrain.eraseCircle(40, 44, 12);

    expect(terrain.solidCellCount()).toBeLessThan(before);
    expect(terrain.isSolidAt(40, 44)).toBe(false);
  });
});

describe('GameSimulation', () => {
  it('spawns walkers and counts a lemming saved when it reaches the exit', () => {
    const sim = new GameSimulation(makeFlatLevel());

    for (let i = 0; i < 900; i += 1) {
      sim.step(16);
    }

    expect(sim.state.spawned).toBe(1);
    expect(sim.state.saved).toBe(1);
    expect(sim.state.outcome).toBe('won');
  });

  it('blockers reverse walkers that run into them', () => {
    const level = makeFlatLevel({ totalLemmings: 2, targetSaved: 2 });
    const sim = new GameSimulation(level);
    sim.step(120);
    sim.step(120);

    const first = sim.state.lemmings[0];
    const second = sim.state.lemmings[1];
    sim.assignSkill(first.id, 'blocker');

    for (let i = 0; i < 140; i += 1) {
      sim.step(16);
    }

    expect(first.state).toBe('blocker');
    expect(second.direction).toBe(-1);
  });

  it('diggers carve the terrain below themselves', () => {
    const terrain = new Terrain(120, 120, 4);
    terrain.fillRect(0, 72, 120, 48);
    const sim = new GameSimulation(
      makeFlatLevel({
        width: 120,
        spawn: { x: 32, y: 56 },
        exit: { x: 100, y: 56, width: 16, height: 24 },
        terrain,
      }),
    );
    sim.step(120);
    const lemming = sim.state.lemmings[0];
    const before = terrain.solidCellCount();

    sim.assignSkill(lemming.id, 'digger');
    for (let i = 0; i < 30; i += 1) {
      sim.step(16);
    }

    expect(terrain.solidCellCount()).toBeLessThan(before);
    expect(terrain.isSolidAt(lemming.x, 76)).toBe(false);
  });

  it('assigning a skill consumes one available use', () => {
    const sim = new GameSimulation(
      makeFlatLevel({
        skills: {
          blocker: 0,
          builder: 0,
          digger: 1,
        },
      }),
    );
    sim.step(120);
    const lemming = sim.state.lemmings[0];

    expect(sim.assignSkill(lemming.id, 'digger')).toBe(true);
    expect(sim.state.skills.digger).toBe(0);
    expect(sim.assignSkill(lemming.id, 'digger')).toBe(false);
  });

  it('release rate controls make lemmings spawn faster', () => {
    const slow = new GameSimulation(makeFlatLevel({ totalLemmings: 4, targetSaved: 4, releaseRate: 1 }));
    const fast = new GameSimulation(makeFlatLevel({ totalLemmings: 4, targetSaved: 4, releaseRate: 1 }));
    fast.changeReleaseRate(98);

    slow.step(180);
    fast.step(180);

    expect(fast.state.releaseRate).toBe(99);
    expect(fast.state.spawned).toBeGreaterThan(slow.state.spawned);
  });

  it('builders create a rising bridge in front of their walking direction', () => {
    const terrain = new Terrain(180, 120, 4);
    terrain.fillRect(0, 88, 82, 32);
    terrain.fillRect(124, 88, 56, 32);
    const sim = new GameSimulation(
      makeFlatLevel({
        width: 180,
        spawn: { x: 44, y: 72 },
        exit: { x: 145, y: 72, width: 18, height: 24 },
        terrain,
      }),
    );
    sim.step(120);
    const lemming = sim.state.lemmings[0];
    sim.assignSkill(lemming.id, 'builder');

    for (let i = 0; i < 80; i += 1) {
      sim.step(16);
    }

    expect(terrain.isSolidAt(54, 84)).toBe(true);
    expect(terrain.isSolidAt(90, 76)).toBe(true);
  });

  it('pulse reverses active walkers as the first remix verb', () => {
    const sim = new GameSimulation(makeFlatLevel({ totalLemmings: 2, targetSaved: 2 }));
    sim.step(120);
    sim.step(120);

    const changed = sim.triggerPulse();

    expect(changed).toBe(2);
    expect(sim.state.lemmings.map((lemming) => lemming.direction)).toEqual([-1, -1]);
  });
});
