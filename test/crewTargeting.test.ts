import { describe, expect, it } from 'vitest';
import { selectCrewTarget } from '../src/input/crewTargeting';
import { salvagerTargetMetric } from '../src/render/CrewSpriteRenderer';
import { layoutLemmingCrowds, SALVAGER_CROWD_SPACING } from '../src/render/crowdLayout';
import type { Lemming } from '../src/sim/types';

function crew(id: number, x: number, y: number, state: Lemming['state'] = 'walker'): Lemming {
  return {
    id,
    x,
    y,
    direction: 1,
    velocityY: 0,
    state,
    buildSteps: 0,
    actionTimerMs: 0,
    fallStartY: y,
    isClimber: false,
    isFloater: false,
    isSwimmer: false,
    sealedMs: 0,
    fuseMs: null,
    squashMs: 0,
    pendingHatchSkill: null,
  };
}

describe('selectCrewTarget', () => {
  it('uses display positions and ignores dead or exited crew', () => {
    const lemmings = [crew(1, 100, 100), crew(2, 100, 100, 'dead')];
    const display = new Map([
      [1, { x: 124, y: 100 }],
      [2, { x: 100, y: 100 }],
    ]);
    expect(selectCrewTarget(lemmings, display, 124, 104, 24)?.id).toBe(1);
    expect(selectCrewTarget(lemmings, display, 100, 104, 8)).toBeNull();
  });

  it('breaks exact overlap ties by frontmost display Y, then stable ID', () => {
    const lemmings = [crew(9, 100, 100), crew(4, 100, 100), crew(2, 100, 100)];
    const display = new Map([
      [9, { x: 100, y: 101 }],
      [4, { x: 100, y: 103 }],
      [2, { x: 100, y: 103 }],
    ]);
    expect(selectCrewTarget(lemmings, display, 100, 106, 24)?.id).toBe(2);
  });

  it('selects each grounded actor from an off-centre visible-body tap in a ten-crew fan', () => {
    const lemmings = Array.from({ length: 10 }, (_, index) => crew(index + 1, 100, 100));
    const display = layoutLemmingCrowds(lemmings, 0, SALVAGER_CROWD_SPACING);

    for (const lemming of lemmings) {
      const point = display.get(lemming.id);
      expect(point).toBeDefined();
      expect(selectCrewTarget(
        lemmings,
        display,
        point!.x + 4,
        point!.y - 7,
        24,
        (_crew, displayPoint) => displayPoint.y - 3,
      )?.id).toBe(lemming.id);
    }
  });

  it('keeps mixed-role Level-9-style crowds selectable from exposed body pixels', () => {
    const states: Lemming['state'][] = ['walker', 'blocker', 'builder', 'basher', 'miner', 'digger', 'climber', 'walker', 'walker', 'walker'];
    const lemmings = states.map((state, index) => crew(index + 1, 100 + (index % 3) * 5, 100, state));
    lemmings[6].isClimber = true;
    lemmings[7].isFloater = true;
    lemmings[8].isSwimmer = true;
    lemmings[9].fuseMs = 2500;
    const display = layoutLemmingCrowds(lemmings, 0, SALVAGER_CROWD_SPACING);

    for (const lemming of lemmings) {
      const point = display.get(lemming.id)!;
      expect(selectCrewTarget(
        lemmings,
        display,
        point.x + 6,
        point.y - 8,
        24,
        (_crew, displayPoint) => displayPoint.y - 3,
      )?.id).toBe(lemming.id);
    }
  });

  it('assigns generated tool tips, climb limbs, and canopies to their visible owner', () => {
    const cases = [
      { role: 'basher', offset: (direction: number) => ({ x: direction * 22, y: -8 }) },
      { role: 'builder', offset: (direction: number) => ({ x: direction * 20, y: -1 }) },
      { role: 'climber', offset: (direction: number) => ({ x: direction * 15, y: -20 }) },
      { role: 'floater', offset: () => ({ x: 0, y: -35 }) },
    ] as const;

    for (const reverse of [false, true]) {
      for (const direction of [-1, 1] as const) {
        for (const testCase of cases) {
          const lemmings = Array.from({ length: 10 }, (_, index) => crew(index + 1, 100, 100));
          const owner = lemmings[4];
          owner.direction = direction;
          if (testCase.role === 'basher' || testCase.role === 'builder' || testCase.role === 'climber') {
            owner.state = testCase.role;
          }
          if (testCase.role === 'floater') {
            owner.state = 'faller';
            owner.isFloater = true;
          }
          const renderOrder = reverse ? [...lemmings].reverse() : lemmings;
          const display = layoutLemmingCrowds(renderOrder, 0, SALVAGER_CROWD_SPACING);
          const point = display.get(owner.id)!;
          const offset = testCase.offset(direction);

          expect(selectCrewTarget(
            renderOrder,
            display,
            point.x + offset.x,
            point.y + offset.y,
            24,
            (_crew, displayPoint) => displayPoint.y - 3,
            salvagerTargetMetric,
          )?.id, `${testCase.role} dir=${direction} reverse=${reverse}`).toBe(owner.id);
        }
      }
    }
  });

  it('selects the frontmost owner when adjacent tool silhouettes overlap', () => {
    for (const state of ['builder', 'basher'] as const) {
      const left = crew(1, 100, 100, state);
      const right = crew(2, 100, 100, state);
      left.direction = 1;
      right.direction = -1;
      const lemmings = [left, right];
      const display = layoutLemmingCrowds(lemmings, 0, SALVAGER_CROWD_SPACING);
      const leftPoint = display.get(left.id)!;
      const overlapX = state === 'builder' ? leftPoint.x + 10 : leftPoint.x + 9;
      const overlapY = state === 'builder' ? leftPoint.y - 1 : leftPoint.y - 8;

      for (const renderOrder of [lemmings, [...lemmings].reverse()]) {
        const expectedFront = renderOrder[renderOrder.length - 1];
        expect(selectCrewTarget(
          renderOrder,
          display,
          overlapX,
          overlapY,
          24,
          (_crew, point) => point.y - 3,
          salvagerTargetMetric,
        )?.id, `${state} front=${expectedFront.id}`).toBe(expectedFront.id);
      }
    }
  });
});
