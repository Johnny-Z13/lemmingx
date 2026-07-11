import type Phaser from 'phaser';
import type { Lemming } from '../sim/types';

/**
 * Procedural "cute retro pixel" lemming renderer.
 *
 * Each creature is drawn from chunky pixel blocks into an immediate-mode
 * Graphics object: a pale body, a tuft of colored hair, a face, and limbs that
 * animate per state. Direction-aware and frame-animated via a shared clock, so
 * the crew reads as a bustling, expressive swarm rather than identical dots.
 *
 * No copyrighted sprites — every pixel is placed here in code.
 */

// Palette. Body/skin stay constant so the swarm reads as one species; the
// hair colour shifts with state so a glance tells you who is doing what.
const SKIN = 0xf2c9a0;
const SKIN_SHADE = 0xd9a87f;
const BODY = 0x4f74e3; // classic blue smock
const BODY_SHADE = 0x3a59bd;
const HAIR_DEFAULT = 0x5ef2a1; // green tuft, like the originals
const EYE = 0x1a2030;
const DEAD = 0x6a7283;
const PARACHUTE = 0xff7aa8;

/** Hair colour by state — the at-a-glance "job light". */
const HAIR_BY_STATE: Record<string, number> = {
  walker: HAIR_DEFAULT,
  faller: 0xffe06b,
  climber: 0xffd24d,
  blocker: 0xff5b7f,
  builder: 0x6ae1ff,
  basher: 0xffa24d,
  miner: 0xc4a06a,
  digger: 0xd696ff,
  shrug: 0xff9ec8,
};

/** One pixel unit. Body is ~8 wide x ~12 tall at this scale. */
const PX = 1.5;

/** A tiny helper: fill a pixel-block rect in local sprite space. */
function blk(g: Phaser.GameObjects.Graphics, ox: number, oy: number, color: number, x: number, y: number, w: number, h: number): void {
  g.fillStyle(color, 1);
  g.fillRect(ox + x * PX, oy + y * PX, w * PX, h * PX);
}

/**
 * Draw one lemming. `(cx, cy)` is the sim position (cy is roughly the vertical
 * centre used by the old circle renderer; we offset so the feet land on it).
 * `frame` is a shared animation tick (advances ~12fps). `selected` draws a ring.
 */
export function drawLemming(
  g: Phaser.GameObjects.Graphics,
  lemming: Lemming,
  frame: number,
  selected: boolean,
): void {
  const dir = lemming.direction;
  // Landing squash: briefly squash the sprite toward the feet.
  const squash = lemming.squashMs > 0 ? Math.min(1, lemming.squashMs / 160) : 0;
  const ox = lemming.x - 4 * PX - squash * PX;
  const oy = lemming.y - 9 * PX + squash * 3 * PX;

  if (lemming.state === 'dead') {
    drawSplat(g, ox, oy, frame, lemming);
    return;
  }

  // Selection / hover ring under the feet — pulses slightly.
  if (selected) {
    const pulse = 10 + Math.sin(frame * 0.6) * 1.5;
    g.lineStyle(2, 0xffffff, 0.9);
    g.strokeCircle(lemming.x, lemming.y + 2, pulse);
    g.lineStyle(1, 0x6ae1ff, 0.45);
    g.strokeCircle(lemming.x, lemming.y + 2, pulse + 3);
  }

  const hair = HAIR_BY_STATE[lemming.state] ?? HAIR_DEFAULT;
  const walkPhase = frame % 4; // 0..3 used for limb cycles

  // --- Floater parachute (drawn behind the body) ---
  if (lemming.isFloater && lemming.state === 'faller') {
    drawParachute(g, ox, oy, frame);
  }

  // --- Hair tuft ---
  // A little swept tuft; leans in the facing direction.
  blk(g, ox, oy, hair, dir === 1 ? 1 : 2, -1, 4, 2);
  blk(g, ox, oy, hair, dir === 1 ? 4 : 1, 0, 1, 1);

  // --- Head ---
  blk(g, ox, oy, SKIN, 1, 1, 4, 3);
  blk(g, ox, oy, SKIN_SHADE, 1, 3, 4, 1);
  // Eye (faces direction). Shrug looks upward / worried.
  if (lemming.state === 'shrug') {
    blk(g, ox, oy, EYE, dir === 1 ? 3 : 1, 1, 1, 1);
  } else {
    blk(g, ox, oy, EYE, dir === 1 ? 3 : 1, 2, 1, 1);
  }

  // --- Body / smock (wider when squashed) ---
  const bodyW = squash > 0.2 ? 5 : 4;
  const bodyX = squash > 0.2 ? 0.5 : 1;
  blk(g, ox, oy, BODY, bodyX, 4, bodyW, squash > 0.2 ? 3 : 4);
  blk(g, ox, oy, BODY_SHADE, bodyX, squash > 0.2 ? 6 : 7, bodyW, 1);

  // --- State-specific overlays + limbs ---
  switch (lemming.state) {
    case 'walker':
    case 'climber':
      drawWalkLegs(g, ox, oy, walkPhase, lemming.state === 'climber');
      if (lemming.state === 'climber') drawClimbArms(g, ox, oy, dir, frame);
      break;
    case 'faller':
      drawFallLimbs(g, ox, oy, dir, lemming.isFloater);
      break;
    case 'blocker':
      drawBlockerArms(g, ox, oy, frame);
      drawWalkLegs(g, ox, oy, 0, false);
      break;
    case 'builder':
      drawBuilderArms(g, ox, oy, dir, frame);
      drawWalkLegs(g, ox, oy, 0, false);
      break;
    case 'basher':
      drawBasherArms(g, ox, oy, dir, frame);
      drawWalkLegs(g, ox, oy, 0, false);
      break;
    case 'miner':
      drawMinerArms(g, ox, oy, dir, frame);
      drawWalkLegs(g, ox, oy, 0, false);
      break;
    case 'digger':
      drawDiggerArms(g, ox, oy, frame);
      break;
    case 'shrug':
      drawShrugPose(g, ox, oy, frame);
      break;
    default:
      drawWalkLegs(g, ox, oy, 0, false);
  }

  // --- Armed-bomber fuse: blink + classic 5→1 countdown above the head ---
  if (lemming.fuseMs !== null && lemming.fuseMs > 0) {
    const blink = Math.floor(frame / 2) % 2 === 0;
    if (blink) {
      g.fillStyle(0xffffff, 0.5);
      g.fillRect(ox + 1 * PX, oy + 1 * PX, 4 * PX, 7 * PX);
    }
    const digit = Math.max(1, Math.ceil(lemming.fuseMs / 1000));
    drawDigit(g, lemming.x, lemming.y - 16 - squash * 2, digit);
  }
}

/** Classic "oh no" — both arms up, feet planted. */
function drawShrugPose(g: Phaser.GameObjects.Graphics, ox: number, oy: number, frame: number): void {
  const bob = Math.floor(frame / 2) % 2;
  blk(g, ox, oy, SKIN, -1, 1 + bob, 2, 1);
  blk(g, ox, oy, SKIN, 5, 1 + bob, 2, 1);
  blk(g, ox, oy, SKIN, -1, 2 + bob, 1, 2);
  blk(g, ox, oy, SKIN, 6, 2 + bob, 1, 2);
  blk(g, ox, oy, SKIN_SHADE, 1, 8, 2, 1);
  blk(g, ox, oy, SKIN_SHADE, 3, 8, 2, 1);
}

function drawWalkLegs(g: Phaser.GameObjects.Graphics, ox: number, oy: number, phase: number, climbing: boolean): void {
  // Two feet that alternate forward/back to read as a stride.
  const a = phase === 1 ? 1 : phase === 3 ? -1 : 0;
  if (climbing) {
    // Tucked legs while climbing.
    blk(g, ox, oy, SKIN_SHADE, 1, 8, 2, 1);
    blk(g, ox, oy, SKIN_SHADE, 3, 8, 2, 1);
    return;
  }
  blk(g, ox, oy, SKIN_SHADE, 1 + a, 8, 2, 1);
  blk(g, ox, oy, SKIN_SHADE, 3 - a, 8, 2, 1);
}

function drawFallLimbs(g: Phaser.GameObjects.Graphics, ox: number, oy: number, dir: number, floating: boolean): void {
  if (floating) {
    // Legs dangle calmly under the parachute.
    blk(g, ox, oy, SKIN_SHADE, 1, 8, 1, 2);
    blk(g, ox, oy, SKIN_SHADE, 4, 8, 1, 2);
    return;
  }
  // Flailing arms up + splayed legs while plummeting.
  blk(g, ox, oy, SKIN, 0, 3, 1, 2);
  blk(g, ox, oy, SKIN, 5, 3, 1, 2);
  blk(g, ox, oy, SKIN_SHADE, 0, 8, 2, 1);
  blk(g, ox, oy, SKIN_SHADE, 4, 8, 2, 1);
  void dir;
}

function drawClimbArms(g: Phaser.GameObjects.Graphics, ox: number, oy: number, dir: number, frame: number): void {
  // One arm reaches up the wall, alternating.
  const up = Math.floor(frame / 2) % 2 === 0;
  const reachX = dir === 1 ? 5 : 0;
  blk(g, ox, oy, SKIN, reachX, up ? 0 : 3, 1, 2);
}

function drawBlockerArms(g: Phaser.GameObjects.Graphics, ox: number, oy: number, frame: number): void {
  // Both arms thrown out wide — the "stop!" pose, with a slight bob.
  const bob = Math.floor(frame / 3) % 2;
  blk(g, ox, oy, SKIN, -1, 4 + bob, 2, 1);
  blk(g, ox, oy, SKIN, 5, 4 + bob, 2, 1);
}

function drawBuilderArms(g: Phaser.GameObjects.Graphics, ox: number, oy: number, dir: number, frame: number): void {
  // Arm dips down-forward to lay a brick on alternating frames.
  const lay = Math.floor(frame / 2) % 2 === 0;
  const ax = dir === 1 ? 5 : -1;
  blk(g, ox, oy, SKIN, ax, lay ? 6 : 4, 2, 1);
}

function drawBasherArms(g: Phaser.GameObjects.Graphics, ox: number, oy: number, dir: number, frame: number): void {
  // Arm jabs forward at body height; debris-y flicker at the contact point.
  const jab = Math.floor(frame / 1) % 2 === 0;
  const ax = dir === 1 ? (jab ? 5 : 6) : jab ? 0 : -1;
  blk(g, ox, oy, SKIN, ax, 5, 2, 1);
  if (jab) blk(g, ox, oy, 0xffe9c2, dir === 1 ? 7 : -2, 5, 1, 1);
}

function drawMinerArms(g: Phaser.GameObjects.Graphics, ox: number, oy: number, dir: number, frame: number): void {
  // Pick swings on a diagonal: raised behind the head, then buried low ahead.
  const swing = Math.floor(frame / 1) % 2 === 0;
  const ax = dir === 1 ? (swing ? 5 : 6) : swing ? 0 : -1;
  blk(g, ox, oy, SKIN, ax, swing ? 3 : 7, 2, 1);
  if (!swing) blk(g, ox, oy, 0xffe9c2, dir === 1 ? 7 : -2, 8, 1, 1);
}

function drawDiggerArms(g: Phaser.GameObjects.Graphics, ox: number, oy: number, frame: number): void {
  // Both arms scoop downward, alternating, hunched over the hole.
  const scoop = Math.floor(frame / 1) % 2 === 0;
  blk(g, ox, oy, SKIN, 0, scoop ? 7 : 6, 2, 1);
  blk(g, ox, oy, SKIN, 4, scoop ? 6 : 7, 2, 1);
}

function drawParachute(g: Phaser.GameObjects.Graphics, ox: number, oy: number, frame: number): void {
  const sway = Math.sin(frame * 0.4) * PX;
  // Canopy.
  g.fillStyle(PARACHUTE, 0.95);
  g.fillRect(ox - 4 * PX + sway, oy - 8 * PX, 14 * PX, 3 * PX);
  g.fillStyle(0xffffff, 0.5);
  g.fillRect(ox - 4 * PX + sway, oy - 8 * PX, 14 * PX, 1 * PX);
  // Strings.
  g.lineStyle(1, 0xffffff, 0.6);
  g.lineBetween(ox - 3 * PX + sway, oy - 5 * PX, ox + 1 * PX, oy + 1 * PX);
  g.lineBetween(ox + 9 * PX + sway, oy - 5 * PX, ox + 4 * PX, oy + 1 * PX);
}

function drawSplat(g: Phaser.GameObjects.Graphics, ox: number, oy: number, frame: number, lemming: Lemming): void {
  // A flattened smudge. Fades subtly over time using the action timer.
  void frame;
  const alpha = lemming.actionTimerMs > 0 ? Math.max(0.3, 1 - lemming.actionTimerMs / 4000) : 0.85;
  g.fillStyle(DEAD, alpha);
  g.fillRect(ox - 1 * PX, oy + 8 * PX, 8 * PX, 2 * PX);
  g.fillStyle(0xff5b7f, alpha * 0.6);
  g.fillRect(ox + 1 * PX, oy + 7 * PX, 4 * PX, 1 * PX);
}

/**
 * Tiny 3×5 pixel digit drawn centered on (cx, cy). Used for the bomber fuse
 * countdown (classic "5…4…3…2…1"). Segments are bitmasks for rows 0..4.
 */
const DIGIT_ROWS: Record<number, readonly number[]> = {
  1: [0b010, 0b110, 0b010, 0b010, 0b111],
  2: [0b111, 0b001, 0b111, 0b100, 0b111],
  3: [0b111, 0b001, 0b111, 0b001, 0b111],
  4: [0b101, 0b101, 0b111, 0b001, 0b001],
  5: [0b111, 0b100, 0b111, 0b001, 0b111],
};

function drawDigit(g: Phaser.GameObjects.Graphics, cx: number, cy: number, digit: number): void {
  const rows = DIGIT_ROWS[digit] ?? DIGIT_ROWS[5];
  const ox = cx - 1.5 * PX;
  const oy = cy - 2.5 * PX;
  g.fillStyle(0xfff6d8, 1);
  for (let row = 0; row < 5; row += 1) {
    const bits = rows[row];
    for (let col = 0; col < 3; col += 1) {
      if (bits & (0b100 >> col)) {
        g.fillRect(ox + col * PX, oy + row * PX, PX, PX);
      }
    }
  }
}
