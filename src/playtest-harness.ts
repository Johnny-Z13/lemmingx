import type Phaser from 'phaser';
import type { GameSimulation } from './sim/GameSimulation';

export interface LemmingXPlaytestSnapshot {
  levelIndex: number;
  levelName: string;
  planning: boolean;
  paused: boolean;
  timeMs: number;
  outcome: 'running' | 'won' | 'lost';
  spawned: number;
  saved: number;
  lost: number;
  selectedSkill: string;
  activeEmitters: number;
}

export interface LemmingXPlaytestHarness {
  snapshot(): LemmingXPlaytestSnapshot;
  advanceTicks(count: number): LemmingXPlaytestSnapshot;
}

interface InspectableScene {
  levelIndex: number;
  level: { name?: string };
  planning: boolean;
  paused: boolean;
  sim: GameSimulation;
}

/** Install only behind `?playtest=1` in a development build. */
export function installPlaytestHarness(game: Phaser.Game): LemmingXPlaytestHarness {
  const scene = () => game.scene.getScene('GameScene') as unknown as InspectableScene;
  const snapshot = (): LemmingXPlaytestSnapshot => {
    const current = scene();
    const state = current.sim.state;
    return {
      levelIndex: current.levelIndex,
      levelName: current.level.name ?? 'LemmingX',
      planning: current.planning,
      paused: current.paused,
      timeMs: state.timeMs,
      outcome: state.outcome,
      spawned: state.spawned,
      saved: state.saved,
      lost: state.lost,
      selectedSkill: state.selectedSkill,
      activeEmitters: state.emitters.filter(({ active }) => active).length,
    };
  };
  const harness: LemmingXPlaytestHarness = {
    snapshot,
    advanceTicks(count) {
      const current = scene();
      const safeCount = Math.max(0, Math.min(10_000, Math.floor(count)));
      for (let index = 0; index < safeCount; index += 1) current.sim.step(16);
      return snapshot();
    },
  };
  (window as unknown as { lemmingxPlaytest: LemmingXPlaytestHarness }).lemmingxPlaytest = harness;
  return harness;
}
