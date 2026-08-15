import type Phaser from 'phaser';
import type { Lemming, Skill } from '../sim/types';
import type { LemmingDisplayPoint } from './crowdLayout';

export const CREW_SALVAGER_TEXTURE_KEY = 'crew-salvager';
export const CREW_SALVAGER_TEXTURE_PATH = 'assets/crew-salvager.png';
export const CREW_SALVAGER_FRAME_SIZE = 64;
export const CREW_SALVAGER_PAINTED_HEIGHT = 42;

/** 42px of painted atlas height becomes ~34 world pixels at this scale. */
export const CREW_SALVAGER_WORLD_SCALE = 0.8;
const FOOT_OFFSET = 16;

export function canUseSalvagerHudIcon(skill: Skill, salvageSlice: boolean): boolean {
  return salvageSlice && skill === 'basher';
}

export function crewSalvagerFrame(lemming: Pick<Lemming, 'state'>, frame: number): number | null {
  if (lemming.state === 'basher') return 4 + frame % 4;
  if (lemming.state === 'walker') return frame % 4;
  return null;
}

/**
 * The M1 atlas is deliberately narrow: only states whose authored frames and
 * overlays are truthful may opt in. Fuse, trait, queued-role, fall and shrug
 * affordances stay on the complete procedural renderer until M2 supplies art.
 */
export function canDrawSalvager(lemming: Pick<
  Lemming,
  'state' | 'fuseMs' | 'isClimber' | 'isFloater' | 'isSwimmer' | 'pendingHatchSkill'
>): boolean {
  return (lemming.state === 'walker' || lemming.state === 'basher') &&
    lemming.fuseMs === null &&
    !lemming.isClimber &&
    !lemming.isFloater &&
    !lemming.isSwimmer &&
    lemming.pendingHatchSkill === null;
}

function displayPriority(lemming: Pick<Lemming, 'state' | 'fuseMs'>): number {
  if (lemming.fuseMs !== null) return 4;
  if (lemming.state === 'faller' || lemming.state === 'treading') return 3;
  if (lemming.state === 'basher') return 2;
  return 1;
}

/** Cached texture renderer for the first original salvage-crew vertical slice. */
export class CrewSpriteRenderer {
  private readonly images = new Map<number, Phaser.GameObjects.Image>();

  constructor(private readonly scene: Phaser.Scene) {}

  beginFrame(): void {
    for (const image of this.images.values()) image.setVisible(false);
  }

  draw(lemming: Lemming, frame: number, point: LemmingDisplayPoint): boolean {
    if (!canDrawSalvager(lemming)) return false;
    const atlasFrame = crewSalvagerFrame(lemming, frame);
    if (atlasFrame === null || lemming.state === 'dead' || lemming.state === 'exited') return false;

    let image = this.images.get(lemming.id);
    if (!image) {
      image = this.scene.add.image(0, 0, CREW_SALVAGER_TEXTURE_KEY, atlasFrame)
        .setOrigin(0.5, 1)
        .setScale(CREW_SALVAGER_WORLD_SCALE);
      this.images.set(lemming.id, image);
    }

    const squash = lemming.squashMs > 0 ? Math.min(0.16, lemming.squashMs / 1000) : 0;
    image
      .setFrame(atlasFrame)
      .setFlipX(lemming.direction < 0)
      .setPosition(point.x, point.y + FOOT_OFFSET)
      .setScale(CREW_SALVAGER_WORLD_SCALE * (1 + squash), CREW_SALVAGER_WORLD_SCALE * (1 - squash))
      .setDepth(20 + displayPriority(lemming) * 0.1 + point.y * 0.0001)
      .setVisible(true);
    return true;
  }

  clear(): void {
    for (const image of this.images.values()) image.destroy();
    this.images.clear();
  }
}
