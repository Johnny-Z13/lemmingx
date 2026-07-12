import { describe, expect, it } from 'vitest';
import { Particles } from '../src/render/Particles';

describe('particle feedback', () => {
  it('creates an OTT transient spray and persistent stain for a fatal fall', () => {
    const particles = new Particles();

    particles.bloodSplat(40, 80);

    expect(particles.count).toBe(104);
    expect(particles.stainCount).toBe(18);
    particles.update(5000);
    expect(particles.count).toBe(0);
    expect(particles.stainCount).toBe(18);
  });

  it('clears blood stains with the rest of the level feedback', () => {
    const particles = new Particles();
    particles.bloodSplat(40, 80);

    particles.clear();

    expect(particles.count).toBe(0);
    expect(particles.stainCount).toBe(0);
  });
});
