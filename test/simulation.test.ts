import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/sim/GameSimulation';
import { MATERIAL, Terrain } from '../src/sim/Terrain';
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
    hatchOpenMs: 0, // tests opt out of the hatch-opening delay
    skills: {
      climber: 10,
      floater: 10,
      bomber: 10,
      blocker: 10,
      builder: 10,
      basher: 10,
      miner: 10,
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

describe('Terrain materials', () => {
  it('steel is solid but never carved', () => {
    const terrain = new Terrain(80, 80, 4);
    terrain.fillRect(0, 40, 80, 8, MATERIAL.steel);
    expect(terrain.isSolidAt(40, 44)).toBe(true);

    const result = terrain.carveRect(0, 40, 80, 8, 0);

    expect(result.carved).toBe(0);
    expect(result.blocked).toBe(true);
    expect(terrain.isSolidAt(40, 44)).toBe(true);
  });

  it('one-way walls carve only in their arrow direction', () => {
    const terrain = new Terrain(80, 80, 4);
    terrain.fillRect(40, 40, 8, 8, MATERIAL.oneWayRight);

    const wrongWay = terrain.carveRect(40, 40, 8, 8, -1);
    expect(wrongWay.carved).toBe(0);
    expect(wrongWay.blocked).toBe(true);
    expect(terrain.isSolidAt(42, 42)).toBe(true);

    const rightWay = terrain.carveRect(40, 40, 8, 8, 1);
    expect(rightWay.carved).toBeGreaterThan(0);
    expect(terrain.isSolidAt(42, 42)).toBe(false);
  });

  it('a digger stops on steel with a clank and the steel survives', () => {
    const terrain = new Terrain(120, 160, 4);
    terrain.fillRect(0, 72, 120, 16); // dirt layer
    terrain.fillRect(0, 88, 120, 16, MATERIAL.steel); // steel slab beneath
    const sim = new GameSimulation(
      makeFlatLevel({
        width: 120,
        height: 160,
        spawn: { x: 32, y: 56 },
        exit: { x: 100, y: 150, width: 16, height: 24 }, // unreachable
        terrain,
      }),
    );
    sim.step(120);
    const lemming = sim.state.lemmings[0];
    sim.assignSkill(lemming.id, 'digger');

    const kinds: string[] = [];
    for (let i = 0; i < 300; i += 1) {
      sim.step(16);
      kinds.push(...sim.drainEvents().map((e) => e.kind));
    }

    expect(terrain.isSolidAt(32, 76)).toBe(false); // dirt was dug
    expect(kinds).toContain('clank');
    expect(lemming.state).not.toBe('digger');
    expect(terrain.isSolidAt(32, 92)).toBe(true); // steel intact
  });

  it('a basher stops at a steel wall with a clank', () => {
    const terrain = new Terrain(200, 120, 4);
    terrain.fillRect(0, 88, 200, 32); // floor
    terrain.fillRect(80, 56, 16, 32, MATERIAL.steel); // steel wall
    const sim = new GameSimulation(
      makeFlatLevel({
        width: 200,
        spawn: { x: 40, y: 72 },
        exit: { x: 180, y: 72, width: 16, height: 24 },
        terrain,
      }),
    );

    let assigned = false;
    const kinds: string[] = [];
    for (let i = 0; i < 300; i += 1) {
      sim.step(16);
      kinds.push(...sim.drainEvents().map((e) => e.kind));
      const l = sim.state.lemmings[0];
      if (l && !assigned && l.state === 'walker' && l.direction === 1 && l.x > 64) {
        assigned = sim.assignSkill(l.id, 'basher');
      }
    }

    expect(assigned).toBe(true);
    expect(kinds).toContain('clank');
    expect(terrain.isSolidAt(88, 72)).toBe(true); // wall intact
    expect(sim.state.lemmings[0].state).not.toBe('basher');
  });

  it('a basher breaches a one-way wall only along its arrow', () => {
    const makeWallLevel = (material: number) => {
      const terrain = new Terrain(200, 120, 4);
      terrain.fillRect(0, 88, 200, 32);
      terrain.fillRect(80, 56, 16, 32, material as 3 | 4);
      return makeFlatLevel({
        width: 200,
        spawn: { x: 40, y: 72 },
        exit: { x: 180, y: 72, width: 16, height: 24 },
        terrain,
      });
    };

    const runBash = (level: LevelDefinition) => {
      const sim = new GameSimulation(level);
      let assigned = false;
      for (let i = 0; i < 600; i += 1) {
        sim.step(16);
        const l = sim.state.lemmings[0];
        if (l && !assigned && l.state === 'walker' && l.direction === 1 && l.x > 64) {
          assigned = sim.assignSkill(l.id, 'basher');
        }
      }
      return { sim, assigned };
    };

    // Arrow pointing right: a rightward basher chews through and exits.
    const withArrow = runBash(makeWallLevel(MATERIAL.oneWayRight));
    expect(withArrow.assigned).toBe(true);
    expect(withArrow.sim.level.terrain.isSolidAt(88, 72)).toBe(false);

    // Arrow pointing left: the same approach is blocked like steel.
    const againstArrow = runBash(makeWallLevel(MATERIAL.oneWayLeft));
    expect(againstArrow.assigned).toBe(true);
    expect(againstArrow.sim.level.terrain.isSolidAt(88, 72)).toBe(true);
  });

  it('a miner carves a diagonal tunnel down in its facing direction', () => {
    const terrain = new Terrain(240, 240, 4);
    terrain.fillRect(0, 88, 240, 152); // deep dirt mass
    const sim = new GameSimulation(
      makeFlatLevel({
        width: 240,
        height: 240,
        spawn: { x: 60, y: 72 },
        exit: { x: 8, y: 230, width: 1, height: 1 }, // unreachable
        terrain,
      }),
    );
    sim.step(120);
    const lemming = sim.state.lemmings[0];
    const startX = lemming.x;
    const startY = lemming.y;
    expect(sim.assignSkill(lemming.id, 'miner')).toBe(true);

    for (let i = 0; i < 240; i += 1) sim.step(16);

    expect(lemming.state).toBe('miner');
    expect(lemming.y).toBeGreaterThan(startY + 30); // descended…
    expect(lemming.x - startX).toBeGreaterThan(25); // …while advancing forward
    // The tunnel mouth behind it is open.
    expect(terrain.isSolidAt(startX + 8, startY + 10)).toBe(false);
  });

  it('a miner stops on steel with a clank', () => {
    const terrain = new Terrain(240, 240, 4);
    terrain.fillRect(0, 88, 240, 32); // dirt band
    terrain.fillRect(0, 120, 240, 24, MATERIAL.steel); // steel base
    const sim = new GameSimulation(
      makeFlatLevel({
        width: 240,
        height: 240,
        spawn: { x: 60, y: 72 },
        exit: { x: 8, y: 230, width: 1, height: 1 },
        terrain,
      }),
    );
    sim.step(120);
    const lemming = sim.state.lemmings[0];
    sim.assignSkill(lemming.id, 'miner');

    const kinds: string[] = [];
    for (let i = 0; i < 400; i += 1) {
      sim.step(16);
      kinds.push(...sim.drainEvents().map((e) => e.kind));
    }

    expect(kinds).toContain('clank');
    expect(lemming.state).not.toBe('miner');
    // The steel base is untouched.
    for (let x = 2; x < 240; x += 4) {
      expect(terrain.isSolidAt(x, 130)).toBe(true);
    }
  });

  it('a miner that breaks through into a cavity falls', () => {
    const terrain = new Terrain(240, 400, 4);
    terrain.fillRect(0, 88, 240, 32); // a floor slab with open air beneath
    terrain.fillRect(0, 380, 240, 20); // ground far below
    const sim = new GameSimulation(
      makeFlatLevel({
        width: 240,
        height: 400,
        spawn: { x: 60, y: 72 },
        exit: { x: 8, y: 390, width: 1, height: 1 },
        terrain,
      }),
    );
    sim.step(120);
    const lemming = sim.state.lemmings[0];
    sim.assignSkill(lemming.id, 'miner');

    let everFell = false;
    for (let i = 0; i < 600; i += 1) {
      sim.step(16);
      if (lemming.state === 'faller') everFell = true;
    }

    expect(everFell).toBe(true);
  });

  it('a bomber crater erases dirt but leaves steel intact', () => {
    const terrain = new Terrain(120, 160, 4);
    terrain.fillRect(0, 72, 120, 16); // dirt floor
    terrain.fillRect(0, 88, 120, 16, MATERIAL.steel); // steel slab beneath
    const sim = new GameSimulation(
      makeFlatLevel({
        width: 120,
        height: 160,
        spawn: { x: 60, y: 56 },
        exit: { x: 5, y: 150, width: 1, height: 1 }, // unreachable
        terrain,
      }),
    );
    sim.step(120);
    const lemming = sim.state.lemmings[0];
    const before = terrain.solidCellCount();
    sim.assignSkill(lemming.id, 'bomber');
    for (let i = 0; i < 400; i += 1) sim.step(16);

    expect(lemming.state).toBe('dead');
    expect(terrain.solidCellCount()).toBeLessThan(before); // dirt crater carved
    for (let x = 2; x < 120; x += 4) {
      expect(terrain.isSolidAt(x, 92)).toBe(true); // entire steel row intact
    }
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

    // The second walker must get reversed by the blocker at some point
    // (it may bounce off the level edge afterwards and face right again).
    let reversed = false;
    for (let i = 0; i < 140; i += 1) {
      sim.step(16);
      if (second.direction === -1) reversed = true;
    }

    expect(first.state).toBe('blocker');
    expect(reversed).toBe(true);
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
          climber: 0,
          floater: 0,
          bomber: 0,
          blocker: 0,
          builder: 0,
          basher: 0,
          miner: 0,
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

  it('kills a lemming that walks into a hazard zone', () => {
    const terrain = new Terrain(240, 120, 4);
    terrain.fillRect(0, 88, 240, 32);
    const sim = new GameSimulation(
      makeFlatLevel({
        terrain,
        // Lava covering the right half of the floor.
        hazards: [{ x: 120, y: 80, width: 120, height: 40, kind: 'lava' }],
      }),
    );

    for (let i = 0; i < 900; i += 1) {
      sim.step(16);
    }

    expect(sim.state.saved).toBe(0);
    expect(sim.state.lost).toBe(1);
    expect(sim.state.outcome).toBe('lost');
  });

  it('bashers carve horizontally and break through a wall', () => {
    const terrain = new Terrain(200, 120, 4);
    terrain.fillRect(0, 88, 200, 32); // floor
    terrain.fillRect(80, 56, 16, 32); // wall blocking the path
    const sim = new GameSimulation(
      makeFlatLevel({
        width: 200,
        spawn: { x: 40, y: 72 },
        exit: { x: 180, y: 72, width: 16, height: 24 },
        terrain,
      }),
    );
    sim.step(120);
    const lemming = sim.state.lemmings[0];
    // Walk up to the wall.
    for (let i = 0; i < 80; i += 1) sim.step(16);
    const before = terrain.solidCellCount();
    sim.assignSkill(lemming.id, 'basher');
    for (let i = 0; i < 200; i += 1) sim.step(16);

    expect(terrain.solidCellCount()).toBeLessThan(before);
    // The wall column should have been breached.
    expect(terrain.isSolidAt(88, 72)).toBe(false);
  });

  it('a floater survives a fall that would otherwise be fatal', () => {
    const terrain = new Terrain(120, 400, 4);
    terrain.fillRect(0, 40, 40, 8); // small ledge up high
    terrain.fillRect(0, 380, 120, 20); // floor far below
    const fatal = new GameSimulation(
      makeFlatLevel({ width: 120, height: 400, spawn: { x: 20, y: 24 }, exit: { x: 200, y: 0, width: 1, height: 1 }, terrain: terrain.clone() }),
    );
    const floaty = new GameSimulation(
      makeFlatLevel({ width: 120, height: 400, spawn: { x: 20, y: 24 }, exit: { x: 200, y: 0, width: 1, height: 1 }, terrain: terrain.clone() }),
    );

    // Control: no floater -> dies on impact.
    for (let i = 0; i < 400; i += 1) fatal.step(16);
    expect(fatal.state.lost).toBe(1);

    // Floater armed before the drop survives.
    floaty.step(120);
    floaty.assignSkill(floaty.state.lemmings[0].id, 'floater');
    for (let i = 0; i < 400; i += 1) floaty.step(16);
    expect(floaty.state.lost).toBe(0);
  });

  it('a bomber explodes after its fuse and carves a crater', () => {
    const terrain = new Terrain(120, 120, 4);
    terrain.fillRect(0, 72, 120, 48);
    const sim = new GameSimulation(
      makeFlatLevel({ width: 120, spawn: { x: 40, y: 56 }, exit: { x: 200, y: 0, width: 1, height: 1 }, terrain }),
    );
    sim.step(120);
    const lemming = sim.state.lemmings[0];
    const before = terrain.solidCellCount();
    sim.assignSkill(lemming.id, 'bomber');
    // Run past the 5s fuse.
    for (let i = 0; i < 400; i += 1) sim.step(16);

    expect(lemming.state).toBe('dead');
    expect(terrain.solidCellCount()).toBeLessThan(before);
  });

  it('emits drainable events for spawn, assign, dig and exit', () => {
    const sim = new GameSimulation(makeFlatLevel());
    // First steps should produce at least one spawn event.
    sim.step(120);
    let kinds = sim.drainEvents().map((e) => e.kind);
    expect(kinds).toContain('spawn');
    // Draining clears the queue.
    expect(sim.drainEvents().length).toBe(0);

    // Assigning emits an 'assign' event.
    const lemming = sim.state.lemmings[0];
    sim.assignSkill(lemming.id, 'digger');
    kinds = sim.drainEvents().map((e) => e.kind);
    expect(kinds).toContain('assign');

    // Running to completion should yield an 'exit' somewhere.
    const sim2 = new GameSimulation(makeFlatLevel());
    const all: string[] = [];
    for (let i = 0; i < 900; i += 1) {
      sim2.step(16);
      all.push(...sim2.drainEvents().map((e) => e.kind));
    }
    expect(all).toContain('exit');
  });

  it('a trap kills the first lemming, then re-arms after its cycle', () => {
    // Two lemmings, far apart: the first springs the trap and dies; the second
    // arrives while the trap is mid-cycle and walks through unharmed.
    const sim = new GameSimulation(
      makeFlatLevel({
        totalLemmings: 2,
        targetSaved: 1,
        spawnIntervalMs: 1200,
        traps: [{ x: 110, y: 60, width: 14, height: 28, kind: 'crusher', cycleMs: 4000 }],
      }),
    );
    const kinds: { kind: string; trapKind?: string }[] = [];
    for (let i = 0; i < 1200 && sim.state.outcome === 'running'; i += 1) {
      sim.step(16);
      kinds.push(...sim.drainEvents());
    }

    const trapEvents = kinds.filter((e) => e.kind === 'trap');
    expect(trapEvents.length).toBe(1);
    expect(trapEvents[0].trapKind).toBe('crusher');
    expect(sim.state.lost).toBe(1);
    expect(sim.state.saved).toBe(1);

    // Same layout with a fast cycle: the trap re-arms and kills both.
    const fast = new GameSimulation(
      makeFlatLevel({
        totalLemmings: 2,
        targetSaved: 1,
        spawnIntervalMs: 1200,
        traps: [{ x: 110, y: 60, width: 14, height: 28, kind: 'zapper', cycleMs: 250 }],
      }),
    );
    for (let i = 0; i < 1200 && fast.state.outcome === 'running'; i += 1) fast.step(16);
    expect(fast.state.lost).toBe(2);
  });

  it('the hatch must finish opening before lemmings spawn', () => {
    const sim = new GameSimulation(makeFlatLevel({ hatchOpenMs: 900 }));
    for (let i = 0; i < 50; i += 1) sim.step(16); // 800ms
    expect(sim.state.spawned).toBe(0);
    for (let i = 0; i < 25; i += 1) sim.step(16); // 1200ms total
    expect(sim.state.spawned).toBe(1);
  });

  it('nukeAll arms every live lemming with a fuse', () => {
    const sim = new GameSimulation(makeFlatLevel({ totalLemmings: 3, targetSaved: 3 }));
    for (let i = 0; i < 200; i += 1) sim.step(16);
    const live = sim.state.lemmings.filter((l) => l.state !== 'dead' && l.state !== 'exited');
    const armed = sim.nukeAll();

    expect(armed).toBe(live.length);
    expect(sim.state.nuking).toBe(true);
    expect(live.every((l) => l.fuseMs !== null)).toBe(true);
  });
});
