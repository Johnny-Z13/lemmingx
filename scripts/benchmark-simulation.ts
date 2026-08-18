import { createLevelAt } from '../src/levels';
import { GameSimulation } from '../src/sim/GameSimulation';

interface BenchmarkResult {
  site: number;
  label: string;
  ticks: number;
  averageMs: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  averageDirtyChunks: number;
  maxDirtyChunks: number;
}

function percentile(sorted: readonly number[], fraction: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ?? 0;
}

function benchmark(site: number, ticks: number, setup?: (sim: GameSimulation) => void): BenchmarkResult {
  const level = createLevelAt(site);
  const sim = new GameSimulation(level);
  setup?.(sim);
  level.terrain.consumeDirtyChunks();
  const samples: number[] = [];
  const dirty: number[] = [];
  for (let tick = 0; tick < ticks; tick += 1) {
    const started = performance.now();
    sim.step(16);
    samples.push(performance.now() - started);
    dirty.push(level.terrain.consumeDirtyChunks().length);
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const averageDirty = dirty.reduce((sum, value) => sum + value, 0) / dirty.length;
  return {
    site: site + 1,
    label: level.name ?? `Site ${site + 1}`,
    ticks,
    averageMs: Number(average.toFixed(3)),
    p95Ms: Number(percentile(sorted, 0.95).toFixed(3)),
    p99Ms: Number(percentile(sorted, 0.99).toFixed(3)),
    maxMs: Number(Math.max(...samples).toFixed(3)),
    averageDirtyChunks: Number(averageDirty.toFixed(2)),
    maxDirtyChunks: Math.max(...dirty),
  };
}

const results = [
  benchmark(0, 5000, (sim) => {
    while (sim.state.lemmings.length === 0) sim.step(16);
    sim.assignSkill(sim.state.lemmings[0].id, 'basher');
  }),
  benchmark(6, 5000, (sim) => {
    sim.paintLandscape(520, 344, 16, 'fire');
    sim.paintLandscape(684, 344, 16, 'fire');
  }),
  benchmark(9, 5000),
];

console.log(JSON.stringify(results, null, 2));
