import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createLevelAt } from '../src/levels';
import { GameSimulation } from '../src/sim/GameSimulation';
import { MATERIAL } from '../src/sim/Terrain';

const STEP_MS = 16;
const root = resolve(import.meta.dirname, '..');

function materialCount(sim: GameSimulation, material: number): number {
  let count = 0;
  sim.level.terrain.forEachSolidCell((_x, _y, _w, _h, value) => {
    if (value === material) count += 1;
  });
  return count;
}

function minMaterialY(sim: GameSimulation, material: number): number {
  let y = Number.POSITIVE_INFINITY;
  sim.level.terrain.forEachSolidCell((_x, cellY, _w, _h, value) => {
    if (value === material) y = Math.min(y, cellY);
  });
  return y;
}

function captureLevel1() {
  const sim = new GameSimulation(createLevelAt(0));
  const milestones: Record<string, number | null> = {
    orderAcceptedMs: null,
    assignmentMs: null,
    breachMs: null,
    sandVisibleMs: null,
    waterReleasedMs: null,
    woodLiftMs: null,
    walkableBridgeMs: null,
    firstCrossingMs: null,
    firstSaveMs: null,
    completionMs: null,
  };
  let initialSaved = 0;
  let orderedCrewId: number | null = null;

  for (let step = 0; step < 4000 && sim.state.outcome === 'running'; step += 1) {
    sim.step(STEP_MS);
    if (orderedCrewId === null) {
      const walker = sim.state.lemmings.find((lemming) => lemming.state === 'walker');
      if (walker && sim.assignSkill(walker.id, 'basher')) {
        orderedCrewId = walker.id;
        milestones.orderAcceptedMs = sim.state.timeMs;
        initialSaved = sim.state.saved;
      }
    }
    if (milestones.assignmentMs === null && orderedCrewId !== null) {
      const ordered = sim.state.lemmings.find(({ id }) => id === orderedCrewId);
      if (ordered?.state === 'basher') milestones.assignmentMs = sim.state.timeMs;
    }
    const elapsed = milestones.assignmentMs === null ? null : sim.state.timeMs - milestones.assignmentMs;
    for (const event of sim.drainEvents()) {
      if (elapsed !== null && event.kind === 'bash' && milestones.breachMs === null) milestones.breachMs = elapsed;
    }
    if (elapsed === null) continue;
    if (milestones.sandVisibleMs === null && materialCount(sim, MATERIAL.sand) > 0) milestones.sandVisibleMs = elapsed;
    if (milestones.waterReleasedMs === null && sim.state.emitters.some(({ def, budgetLeft }) => def.material === 'water' && budgetLeft < def.budget)) milestones.waterReleasedMs = elapsed;
    const woodY = minMaterialY(sim, MATERIAL.wood);
    if (milestones.woodLiftMs === null && woodY < 504) milestones.woodLiftMs = elapsed;
    if (milestones.walkableBridgeMs === null && woodY <= 444) milestones.walkableBridgeMs = elapsed;
    // Match the solvability guard's first post-bridge crossing marker. The old
    // 726px threshold measured the exit approach, not the ten-second material chain.
    if (milestones.firstCrossingMs === null && sim.state.lemmings.some(({ x }) => x >= 540)) milestones.firstCrossingMs = elapsed;
    if (milestones.firstSaveMs === null && sim.state.saved > initialSaved) milestones.firstSaveMs = elapsed;
  }
  if (milestones.assignmentMs !== null && sim.state.outcome === 'won') {
    milestones.completionMs = sim.state.timeMs - milestones.assignmentMs;
  }
  return {
    outcome: sim.state.outcome,
    saved: sim.state.saved,
    lost: sim.state.lost,
    milestones,
    chainWithinTenSeconds: [
      milestones.breachMs,
      milestones.sandVisibleMs,
      milestones.waterReleasedMs,
      milestones.woodLiftMs,
      milestones.walkableBridgeMs,
      milestones.firstCrossingMs,
    ].every((value) => value !== null && value <= 10_000),
  };
}

function captureLevel2() {
  const sim = new GameSimulation(createLevelAt(1));
  const stamps = [624, 636, 648, 660, 672, 684, 696, 720];
  for (const x of stamps) sim.paintLandscape(x, 408, 16, 'water');
  for (let step = 0; step < 4000 && sim.state.outcome === 'running'; step += 1) sim.step(STEP_MS);
  return {
    input: 'reserved-endpoint landscape-touch stroke equivalent',
    stamps,
    outcome: sim.state.outcome,
    saved: sim.state.saved,
    lost: sim.state.lost,
  };
}

function captureLevel3(route: 'bomber' | 'sand') {
  const sim = new GameSimulation(createLevelAt(2));
  let actionCount = 0;
  let blockerId: number | null = null;
  let blockedAt = 0;
  let released = false;
  for (let step = 0; step < 22_000 && sim.state.outcome === 'running'; step += 1) {
    sim.step(STEP_MS);
    if (route === 'bomber' && actionCount === 0) {
      const walker = sim.state.lemmings.find(
        (lemming) => lemming.state === 'walker' && lemming.direction === 1 && lemming.x > 548 && lemming.x < 554,
      );
      if (walker && sim.assignSkill(walker.id, 'blocker')) {
        sim.assignSkill(walker.id, 'bomber');
        actionCount = 1;
      }
    }
    if (route === 'sand' && blockerId === null) {
      const walker = sim.state.lemmings.find(
        (lemming) => lemming.state === 'walker' && lemming.direction === 1 && lemming.x > 520 && lemming.x < 530,
      );
      if (walker && sim.assignSkill(walker.id, 'blocker')) {
        blockerId = walker.id;
        blockedAt = sim.state.timeMs;
      }
    }
    if (route === 'sand' && blockerId !== null && actionCount < 3 && sim.state.timeMs > blockedAt + 200 + actionCount * 400) {
      if (sim.paintLandscape(564, 392, 16, 'sand')) actionCount += 1;
    }
    if (route === 'sand' && blockerId !== null && actionCount === 3 && !released && sim.state.timeMs > blockedAt + 1800) {
      released = sim.assignSkill(blockerId, 'blocker');
    }
  }
  return { route, actionCount, released, outcome: sim.state.outcome, saved: sim.state.saved, lost: sim.state.lost };
}

const proof = {
  schemaVersion: 1,
  deterministicStepMs: STEP_MS,
  level1: captureLevel1(),
  level2: captureLevel2(),
  level3: [captureLevel3('bomber'), captureLevel3('sand')],
};
const [bomberRoute, sandRoute] = proof.level3;
const passed = proof.level1.outcome === 'won' &&
  proof.level1.chainWithinTenSeconds &&
  proof.level2.outcome === 'won' &&
  proof.level3.every(({ outcome }) => outcome === 'won') &&
  sandRoute.saved > bomberRoute.saved &&
  sandRoute.lost < bomberRoute.lost;
if (!passed) throw new Error(`Deterministic proof failed: ${JSON.stringify(proof)}`);

const outDir = join(root, '.artifacts/crazygames-candidate');
await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, 'deterministic-proof.json'), `${JSON.stringify(proof, null, 2)}\n`);
console.log('PASS deterministic Levels 1-3 proof');
console.log(JSON.stringify(proof));
