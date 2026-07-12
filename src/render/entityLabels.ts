import type { LevelDefinition, SimulationState } from '../sim/types';

export interface WorldEntityLabel {
  key: string;
  text: string;
  x: number;
  y: number;
  anchorX: number;
  anchorY: number;
  color: number;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Render-only labels for authored world entities; no display state enters the sim. */
export function worldEntityLabels(
  level: LevelDefinition,
  state: Pick<SimulationState, 'emitters' | 'traps'>,
): WorldEntityLabel[] {
  const labels: WorldEntityLabel[] = [
    {
      key: 'hatch',
      text: 'Hatch · Crew spawn',
      x: level.spawn.x,
      y: level.spawn.y - 54,
      anchorX: level.spawn.x,
      anchorY: level.spawn.y - 30,
      color: 0xffd96b,
    },
    {
      key: 'exit',
      text: 'Exit · Save zone',
      x: level.exit.x + level.exit.width / 2,
      y: level.exit.y - 18,
      anchorX: level.exit.x + level.exit.width / 2,
      anchorY: level.exit.y + 4,
      color: 0x78ffd6,
    },
  ];

  state.emitters.forEach((emitter, index) => {
    const material = titleCase(emitter.def.material);
    const remaining = emitter.budgetLeft > 0 ? `${Math.ceil(emitter.budgetLeft)} left` : 'Empty';
    labels.push({
      key: `emitter-${index}`,
      text: `${material} Spout · ${remaining}`,
      x: emitter.def.x,
      y: emitter.def.y - 22,
      anchorX: emitter.def.x,
      anchorY: emitter.def.y - 5,
      color: emitter.def.material === 'sand' ? 0xd4a84a : 0x3a9fd8,
    });
  });

  state.traps.forEach((trap, index) => {
    labels.push({
      key: `trap-${index}`,
      text: `${titleCase(trap.def.kind)} · ${trap.phase === 'idle' ? 'Armed' : 'Cycling'}`,
      x: trap.def.x + trap.def.width / 2,
      y: trap.def.y - 16,
      anchorX: trap.def.x + trap.def.width / 2,
      anchorY: trap.def.y + 2,
      color: 0xff7a8f,
    });
  });

  (level.hazards ?? []).forEach((hazard, index) => {
    labels.push({
      key: `hazard-${index}`,
      text: `${titleCase(hazard.kind)} · Hazard`,
      x: hazard.x + hazard.width / 2,
      y: hazard.y - 10,
      anchorX: hazard.x + hazard.width / 2,
      anchorY: hazard.y + 4,
      color: hazard.kind === 'lava' ? 0xff5b3a : 0x4ab6ff,
    });
  });

  return labels;
}
