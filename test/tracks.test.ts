import { describe, expect, it } from 'vitest';
import { TRACKS } from '../src/audio/tracks';

/**
 * The sequencer assumes well-formed track data: equal channel lengths, whole
 * bars, parseable note names, and percussion limited to known hit codes.
 */
describe('Chiptune tracks', () => {
  it('ships at least three tracks', () => {
    expect(TRACKS.length).toBeGreaterThanOrEqual(3);
  });

  it.each(TRACKS.map((t) => [t.name, t] as const))('%s is well-formed', (_name, track) => {
    expect(track.bpm).toBeGreaterThanOrEqual(80);
    expect(track.bpm).toBeLessThanOrEqual(180);

    const length = track.lead.length;
    expect(length % 8).toBe(0);
    expect(track.harmony.length).toBe(length);
    expect(track.bass.length).toBe(length);
    expect(track.noise.length).toBe(length);

    for (const channel of [track.lead, track.harmony, track.bass]) {
      for (const note of channel) {
        if (note !== null) expect(note).toMatch(/^[A-G](#|b)?\d$/);
      }
    }
    for (const hit of track.noise) {
      expect([0, 1, 2]).toContain(hit);
    }
  });
});
