import { describe, expect, it } from 'vitest';
import { MATERIAL, Terrain } from '../src/sim/Terrain';
import { GameSimulation } from '../src/sim/GameSimulation';
import type { LevelDefinition } from '../src/sim/types';

/**
 * The interaction-matrix water model: wade / tread / swim, the universal
 * buried-seal rule, and the per-job flavors (bomber sinks, blocker washes
 * off, climber self-rescue).
 */

function makeLevel(terrain: Terrain, overrides: Partial<LevelDefinition> = {}): LevelDefinition {
  return {
    width: terrain.width,
    height: terrain.height,
    spawn: { x: 20, y: 20 },
    exit: { x: 500, y: 0, width: 1, height: 1 },
    spawnIntervalMs: 1000,
    totalLemmings: 1,
    releaseRate: 50,
    minReleaseRate: 1,
    maxReleaseRate: 99,
    targetSaved: 1,
    hatchOpenMs: 0,
    sandLab: true, // free-play outcome so a single treading lemming never ends the run
    caEnabled: true,
    caSeed: 42,
    caSubsteps: 4,
    skills: {
      climber: 5,
      floater: 5,
      bomber: 5,
      blocker: 5,
      builder: 5,
      basher: 5,
      miner: 5,
      digger: 5,
      swimmer: 5,
    },
    terrain,
    ...overrides,
  };
}

/** Contained pool: side platforms at `bankTop`, water surface at `waterTop`. */
function poolTerrain(bankTop: number, waterTop: number): Terrain {
  const terrain = new Terrain(200, 160, 4);
  terrain.fillRect(0, 140, 200, 20); // basin floor
  terrain.fillRect(0, bankTop, 60, 140 - bankTop); // left platform
  terrain.fillRect(140, bankTop, 60, 140 - bankTop); // right platform
  terrain.fillRect(60, waterTop, 80, 140 - waterTop, MATERIAL.water);
  return terrain;
}

function run(sim: GameSimulation, steps: number, each?: (s: GameSimulation) => void): void {
  for (let i = 0; i < steps; i += 1) {
    sim.step(16);
    each?.(sim);
  }
}

describe('water model', () => {
  it('a long fall into deep water splashes instead of splatting, then treads', () => {
    const sim = new GameSimulation(makeLevel(poolTerrain(116, 120), { spawn: { x: 100, y: 20 } }));
    run(sim, 300);
    const l = sim.state.lemmings[0];
    expect(sim.state.lost).toBe(0);
    expect(l.state).toBe('treading');
    // Head stays above the waterline (surface y=120).
    expect(l.y - 8).toBeLessThan(120);
  });

  it('treading is stable — still alive after many seconds', () => {
    const sim = new GameSimulation(makeLevel(poolTerrain(116, 120), { spawn: { x: 100, y: 20 } }));
    run(sim, 800);
    expect(sim.state.lost).toBe(0);
    expect(sim.state.lemmings[0].state).toBe('treading');
  });

  it('a sealed head (water under a ceiling) drowns after the grace', () => {
    const terrain = new Terrain(200, 160, 4);
    terrain.fillRect(0, 140, 200, 20); // floor
    terrain.fillRect(48, 88, 8, 52); // left wall
    terrain.fillRect(144, 88, 8, 52); // right wall
    terrain.fillRect(48, 80, 104, 8); // ceiling sealing the tank
    terrain.fillRect(56, 88, 88, 52, MATERIAL.water); // water to the brim
    const sim = new GameSimulation(makeLevel(terrain, { spawn: { x: 100, y: 110 } }));
    run(sim, 300); // ~4.8s ≫ grace
    expect(sim.state.lost).toBe(1);
  });

  it('a swimmer crosses the pool and walks out the far bank', () => {
    const sim = new GameSimulation(makeLevel(poolTerrain(116, 120), { spawn: { x: 30, y: 96 } }));
    let assigned = false;
    let crossed = false;
    run(sim, 900, (s) => {
      const l = s.state.lemmings[0];
      if (l && !assigned) assigned = s.assignSkill(l.id, 'swimmer');
      if (l && l.state === 'walker' && l.x > 145) crossed = true; // walking on the far bank
    });
    expect(assigned).toBe(true);
    expect(sim.state.lost).toBe(0);
    expect(crossed).toBe(true);
  });

  it('assigning swimmer to a treading lemming rescues it mid-water', () => {
    const sim = new GameSimulation(makeLevel(poolTerrain(116, 120), { spawn: { x: 100, y: 20 } }));
    run(sim, 300);
    const l = sim.state.lemmings[0];
    expect(l.state).toBe('treading');
    expect(sim.assignSkill(l.id, 'swimmer')).toBe(true);
    expect(l.state).toBe('swimming');
    let escaped = false;
    run(sim, 600, (s) => {
      if (s.state.lemmings[0].state === 'walker') escaped = true; // stood up on a bank
    });
    expect(sim.state.lost).toBe(0);
    expect(escaped).toBe(true);
  });

  it('a treading climber self-rescues up an adjacent wall', () => {
    // Tall banks (24px above the surface) — no step-out possible.
    const sim = new GameSimulation(makeLevel(poolTerrain(96, 120), { spawn: { x: 64, y: 20 } }));
    let assigned = false;
    run(sim, 900, (s) => {
      const l = s.state.lemmings[0];
      if (l && l.state === 'treading' && !assigned) assigned = s.assignSkill(l.id, 'climber');
    });
    const l = sim.state.lemmings[0];
    expect(assigned).toBe(true);
    expect(sim.state.lost).toBe(0);
    // Climbed out: standing on a platform top, clear of the water.
    expect(l.y + 14).toBeLessThanOrEqual(97);
  });

  it('deep water washes a blocker off its post', () => {
    const terrain = new Terrain(200, 160, 4);
    terrain.fillRect(0, 140, 200, 20);
    terrain.fillRect(40, 100, 8, 40);
    terrain.fillRect(152, 100, 8, 40);
    const sim = new GameSimulation(makeLevel(terrain, { spawn: { x: 100, y: 116 } }));
    let planted = false;
    run(sim, 120, (s) => {
      const l = s.state.lemmings[0];
      if (l && l.state === 'walker' && !planted) planted = s.assignSkill(l.id, 'blocker');
    });
    expect(planted).toBe(true);
    expect(sim.state.lemmings[0].state).toBe('blocker');
    // Flood the basin chest-deep.
    sim.level.terrain.fillRect(48, 104, 104, 36, MATERIAL.water);
    run(sim, 60);
    expect(sim.state.lemmings[0].state).toBe('treading');
    expect(sim.state.lost).toBe(0);
  });

  it('an armed bomber sinks and detonates underwater', () => {
    const sim = new GameSimulation(makeLevel(poolTerrain(116, 120), { spawn: { x: 30, y: 96 } }));
    let armed = false;
    let underwaterBlast = false;
    run(sim, 900, (s) => {
      const l = s.state.lemmings[0];
      if (l && l.state === 'walker' && !armed) armed = s.assignSkill(l.id, 'bomber');
      for (const e of s.drainEvents()) {
        if (e.kind === 'explode' && e.y > 120) underwaterBlast = true;
      }
    });
    expect(armed).toBe(true);
    expect(underwaterBlast).toBe(true); // blast happened below the waterline
    expect(sim.state.lost).toBe(1);
  });

  it('shallow water is waded, not floated', () => {
    const terrain = new Terrain(200, 160, 4);
    terrain.fillRect(0, 140, 200, 20);
    terrain.fillRect(80, 132, 40, 8, MATERIAL.water); // ankle-deep strip
    const sim = new GameSimulation(makeLevel(terrain, { spawn: { x: 30, y: 116 } }));
    let crossed = false;
    run(sim, 600, (s) => {
      const l = s.state.lemmings[0];
      if (l && l.state === 'walker' && l.x > 130) crossed = true;
    });
    expect(crossed).toBe(true);
    expect(sim.state.lost).toBe(0);
  });

  it('sand flooding a tunnel suffocates the crew inside (burial rule)', () => {
    const terrain = new Terrain(200, 160, 4);
    terrain.fillRect(0, 140, 200, 20); // floor
    terrain.fillRect(60, 108, 80, 8); // tunnel ceiling (gallery 116..140)
    const sim = new GameSimulation(makeLevel(terrain, { spawn: { x: 30, y: 116 } }));
    let buried = false;
    run(sim, 600, (s) => {
      const l = s.state.lemmings[0];
      if (l && !buried && l.state === 'walker' && l.x > 90) {
        buried = true;
        s.paintCircle(l.x, l.y, 20, MATERIAL.sand); // dump sand over it in the tunnel
      }
    });
    expect(buried).toBe(true);
    expect(sim.state.lost).toBe(1);
  });
});
