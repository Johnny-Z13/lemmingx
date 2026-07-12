import type Phaser from 'phaser';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  lifeMs: number;
  maxLifeMs: number;
  size: number;
  color: number;
  gravity: number;
}

interface BloodStain {
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
  alpha: number;
}

const GRAVITY = 0.0007; // px/ms^2
const BLOOD = [0x350008, 0x690014, 0xa90022, 0xe21b3d];
const MAX_BLOOD_STAINS = 240;

/**
 * A small pooled CPU particle system drawn into a Graphics layer. Used for
 * dust on digging/bashing, debris on explosions, sparkles at the exit, and
 * smudges on splats — quick, cheap feedback that makes actions feel physical.
 */
export class Particles {
  private particles: Particle[] = [];
  private bloodStains: BloodStain[] = [];

  /** Spawn `count` particles in a burst with the given style. */
  burst(
    x: number,
    y: number,
    count: number,
    opts: {
      color: number | number[];
      speed?: number;
      spread?: number; // radians; full circle by default
      angle?: number; // base direction
      lifeMs?: number;
      size?: number;
      gravity?: number;
      upward?: boolean;
    },
  ): void {
    const {
      color,
      speed = 0.08,
      spread = Math.PI * 2,
      angle = -Math.PI / 2,
      lifeMs = 600,
      size = 2,
      gravity = GRAVITY,
      upward = false,
    } = opts;
    for (let i = 0; i < count; i += 1) {
      const a = angle + (Math.random() - 0.5) * spread;
      const s = speed * (0.4 + Math.random() * 0.6);
      const col = Array.isArray(color) ? color[(Math.random() * color.length) | 0] : color;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - (upward ? 0.05 : 0),
        lifeMs: lifeMs * (0.6 + Math.random() * 0.4),
        maxLifeMs: lifeMs,
        size: size * (0.6 + Math.random() * 0.8),
        color: col,
        gravity,
      });
    }
  }

  update(deltaMs: number): void {
    const next: Particle[] = [];
    for (const p of this.particles) {
      p.lifeMs -= deltaMs;
      if (p.lifeMs <= 0) continue;
      p.vy += p.gravity * deltaMs;
      p.x += p.vx * deltaMs;
      p.y += p.vy * deltaMs;
      next.push(p);
    }
    this.particles = next;
  }

  draw(g: Phaser.GameObjects.Graphics): void {
    for (const stain of this.bloodStains) {
      g.fillStyle(stain.color, stain.alpha);
      g.fillEllipse(stain.x, stain.y, stain.width, stain.height);
    }
    for (const p of this.particles) {
      const alpha = Math.max(0, Math.min(1, p.lifeMs / p.maxLifeMs));
      g.fillStyle(p.color, alpha);
      g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }

  /** Deliberately excessive fall-death spray plus a level-persistent ground stain. */
  bloodSplat(x: number, y: number): void {
    this.bloodStains.push({ x, y, width: 28, height: 7, color: BLOOD[1], alpha: 0.9 });
    for (let i = 0; i < 17; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 5 + Math.random() * 27;
      this.bloodStains.push({
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance * 0.22,
        width: 2 + Math.random() * 7,
        height: 1.5 + Math.random() * 3,
        color: BLOOD[(Math.random() * 3) | 0],
        alpha: 0.72 + Math.random() * 0.25,
      });
    }
    if (this.bloodStains.length > MAX_BLOOD_STAINS) {
      this.bloodStains.splice(0, this.bloodStains.length - MAX_BLOOD_STAINS);
    }

    this.burst(x, y - 2, 48, {
      color: BLOOD,
      speed: 0.25,
      spread: Math.PI * 1.25,
      angle: -Math.PI / 2,
      lifeMs: 1150,
      size: 3.4,
      gravity: 0.00085,
      upward: true,
    });
    this.burst(x, y, 24, {
      color: BLOOD,
      speed: 0.32,
      lifeMs: 720,
      size: 1.5,
      gravity: 0.00065,
    });
    this.burst(x, y, 16, {
      color: BLOOD,
      speed: 0.2,
      spread: Math.PI * 0.35,
      angle: 0,
      lifeMs: 850,
      size: 2.4,
      gravity: 0.0008,
    });
    this.burst(x, y, 16, {
      color: BLOOD,
      speed: 0.2,
      spread: Math.PI * 0.35,
      angle: Math.PI,
      lifeMs: 850,
      size: 2.4,
      gravity: 0.0008,
    });
  }

  /** Spawn a ring of particles expanding outward (skill-assign pop). */
  ring(
    x: number,
    y: number,
    count: number,
    opts: { color: number | number[]; speed?: number; lifeMs?: number; size?: number } = {
      color: 0xffffff,
    },
  ): void {
    const { color, speed = 0.12, lifeMs = 380, size = 2 } = opts;
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2;
      const col = Array.isArray(color) ? color[i % color.length] : color;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        lifeMs: lifeMs * (0.7 + Math.random() * 0.3),
        maxLifeMs: lifeMs,
        size: size * (0.7 + Math.random() * 0.5),
        color: col,
        gravity: 0,
      });
    }
  }

  clear(): void {
    this.particles = [];
    this.bloodStains = [];
  }

  get count(): number {
    return this.particles.length;
  }

  get stainCount(): number {
    return this.bloodStains.length;
  }
}
