import { describe, expect, it } from 'vitest';
import { createLevelAt } from '../src/levels';
import { worldEntityLabels } from '../src/render/entityLabels';
import { GameSimulation } from '../src/sim/GameSimulation';

describe('world entity labels', () => {
  it('labels the hatch, exit, and material spout with useful names and status', () => {
    const sim = new GameSimulation(createLevelAt(4));
    const labels = worldEntityLabels(sim.level, sim.state);

    expect(labels.map(({ text }) => text)).toEqual(expect.arrayContaining([
      'Hatch · Crew spawn',
      'Exit · Save zone',
      'Sand Spout · 200 left',
    ]));
  });

  it('labels every trap and exposes whether it is armed', () => {
    const sim = new GameSimulation(createLevelAt(5));
    const labels = worldEntityLabels(sim.level, sim.state);

    expect(labels.map(({ text }) => text)).toEqual(expect.arrayContaining([
      'Crusher · Armed',
      'Zapper · Armed',
      'Chomper · Armed',
    ]));
  });
});
