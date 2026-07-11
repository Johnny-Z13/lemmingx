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

const GRAVITY = 0.0007; // px/ms^2

/**
 * A small pooled CPU particle system drawn into a Graphics layer. Used for
 * dust on digging/bashing, debris on explosions, sparkles at the exit, and
 * smudges on splats — quick, cheap feedback that makes actions feel physical.
 */
export class Particles {
  private particles: Particle[] = [];

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
    for (const p of this.particles) {
      const alpha = Math.max(0, Math.min(1, p.lifeMs / p.maxLifeMs));
      g.fillStyle(p.color, alpha);
      g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
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
  }

  get count(): number {
    return this.particles.length;
  }
}
