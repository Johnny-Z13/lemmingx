import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import {
  CREW_SALVAGER_WORLD_SCALE,
  CREW_SALVAGER_MIN_ALPHA_EXTENT,
  CrewSpriteRenderer,
  canDrawSalvager,
  crewSalvagerFrame,
  salvagerHudFrame,
} from '../src/render/CrewSpriteRenderer';
import { fuseUrgencySegments } from '../src/render/fuseWarning';
import type { Lemming } from '../src/sim/types';

function crew(overrides: Partial<Lemming> = {}): Lemming {
  return {
    id: 1,
    x: 100,
    y: 100,
    direction: 1,
    velocityY: 0,
    state: 'walker',
    buildSteps: 0,
    actionTimerMs: 0,
    fallStartY: 100,
    isClimber: false,
    isFloater: false,
    isSwimmer: false,
    sealedMs: 0,
    fuseMs: null,
    squashMs: 0,
    pendingHatchSkill: null,
    ...overrides,
  };
}

describe('key-art crew sprite family', () => {
  it('maps every live state into its authored four-frame atlas range', () => {
    const starts = {
      walker: 0,
      basher: 4,
      faller: 8,
      shrug: 12,
      climber: 16,
      blocker: 20,
      builder: 24,
      miner: 28,
      digger: 32,
      treading: 36,
      swimming: 40,
    } as const;
    for (const [state, start] of Object.entries(starts)) {
      expect([0, 1, 2, 3].map((frame) => crewSalvagerFrame({ state: state as Lemming['state'] }, frame)))
        .toEqual([start, start + 1, start + 2, start + 3]);
    }
    expect(crewSalvagerFrame({ state: 'dead' }, 0)).toBe(47);
    expect(crewSalvagerFrame({ state: 'exited' }, 0)).toBeNull();
  });

  it('renders every non-exited state through the cached family', () => {
    for (const state of ['walker', 'faller', 'climber', 'blocker', 'builder', 'basher', 'miner', 'digger', 'treading', 'swimming', 'shrug', 'dead'] as const) {
      expect(canDrawSalvager(crew({ state }))).toBe(true);
    }
    expect(canDrawSalvager(crew({ state: 'exited' }))).toBe(false);
  });

  it('keeps fuse, parachute, permanent traits, and queued roles eligible for composited overlays', () => {
    expect(canDrawSalvager(crew({ fuseMs: 3000 }))).toBe(true);
    expect(canDrawSalvager(crew({ state: 'faller', isFloater: true }))).toBe(true);
    expect(canDrawSalvager(crew({ isClimber: true }))).toBe(true);
    expect(canDrawSalvager(crew({ isSwimmer: true }))).toBe(true);
    expect(canDrawSalvager(crew({ pendingHatchSkill: 'basher' }))).toBe(true);
  });

  it('uses the validator-enforced minimum extent rather than the tallest frame', () => {
    const minimumCssExtent = CREW_SALVAGER_MIN_ALPHA_EXTENT * CREW_SALVAGER_WORLD_SCALE * (390 / 540);
    expect(minimumCssExtent).toBeGreaterThanOrEqual(22);
  });

  it('uses a nonnumeric five-lamp urgency language', () => {
    expect([5000, 4000, 3000, 2000, 1000, 1].map(fuseUrgencySegments)).toEqual([5, 4, 3, 2, 1, 1]);
  });

  it('maps every HUD role to a matching atlas action', () => {
    expect(salvagerHudFrame('climber')).toBe(16);
    expect(salvagerHudFrame('floater')).toBe(8);
    expect(salvagerHudFrame('bomber')).toBe(0);
    expect(salvagerHudFrame('blocker')).toBe(20);
    expect(salvagerHudFrame('builder')).toBe(24);
    expect(salvagerHudFrame('basher')).toBe(4);
    expect(salvagerHudFrame('miner')).toBe(28);
    expect(salvagerHudFrame('digger')).toBe(32);
    expect(salvagerHudFrame('swimmer')).toBe(40);
  });

  it('reuses and destroys ten body/canopy pairs without lifecycle growth', () => {
    class MockImage {
      visible = true;
      destroyed = false;
      setOrigin() { return this; }
      setScale() { return this; }
      setFrame() { return this; }
      setTint() { return this; }
      setFlipX() { return this; }
      setPosition() { return this; }
      setDepth() { return this; }
      setVisible(visible: boolean) { this.visible = visible; return this; }
      destroy() { this.destroyed = true; }
    }
    const images: MockImage[] = [];
    const scene = {
      add: {
        image: () => {
          const image = new MockImage();
          images.push(image);
          return image;
        },
      },
    } as unknown as Phaser.Scene;
    const renderer = new CrewSpriteRenderer(scene);
    const floaters = Array.from({ length: 10 }, (_, index) => crew({
      id: index + 1,
      x: 100 + index * 16,
      state: 'faller',
      isFloater: true,
    }));

    floaters.forEach((lemming) => renderer.draw(lemming, 0, lemming));
    expect(images).toHaveLength(20);
    renderer.beginFrame();
    expect(images.every((image) => !image.visible)).toBe(true);
    floaters.forEach((lemming) => renderer.draw(lemming, 1, lemming));
    expect(images).toHaveLength(20);
    renderer.clear();
    expect(images.every((image) => image.destroyed)).toBe(true);
  });
});
