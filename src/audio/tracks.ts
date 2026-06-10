/**
 * Original chiptune loops authored as note data — no audio files. Four
 * channels: two pulse waves (lead/harmony), a triangle bass, and a noise
 * percussion line. One step = an eighth note at the track's bpm.
 *
 * Patterns are written as space-separated note names ('C4', 'F#5', …) with
 * '.' for rests; percussion is a string of digits per step
 * (0 rest, 1 hat, 2 kick).
 */

export interface Track {
  name: string;
  bpm: number;
  lead: (string | null)[];
  harmony: (string | null)[];
  bass: (string | null)[];
  noise: number[];
}

function notes(pattern: string): (string | null)[] {
  return pattern
    .trim()
    .split(/\s+/)
    .map((token) => (token === '.' ? null : token));
}

function drums(pattern: string): number[] {
  return pattern.replace(/\s+/g, '').split('').map(Number);
}

/** Jaunty C-major march — the "everybody walks off a cliff cheerfully" mood. */
const MOB_MARCH: Track = {
  name: 'Mob March',
  bpm: 124,
  lead: notes(`
    C5 .  E5 .  G5 .  E5 .  D5 .  F5 .  A5 F5 G5 .
    E5 .  G5 .  C6 .  G5 .  A5 G5 E5 C5 D5 .  C5 .
    C5 .  E5 .  G5 .  E5 .  F5 .  A5 .  C6 A5 B5 .
    C6 B5 A5 G5 E5 .  G5 .  F5 E5 D5 .  C5 .  .  .
  `),
  harmony: notes(`
    E4 .  G4 .  C5 .  G4 .  B4 .  D5 .  F5 D5 E5 .
    C5 .  E5 .  G5 .  E5 .  F5 E5 C5 A4 B4 .  G4 .
    E4 .  G4 .  C5 .  G4 .  D5 .  F5 .  A5 F5 G5 .
    A5 G5 F5 E5 C5 .  E5 .  D5 C5 B4 .  G4 .  .  .
  `),
  bass: notes(`
    C3 .  C3 .  G2 .  G2 .  G3 .  G3 .  D3 .  G3 .
    C3 .  C3 .  E3 .  E3 .  F3 .  F3 .  G3 .  G3 .
    C3 .  C3 .  G2 .  G2 .  F3 .  F3 .  D3 .  G3 .
    F3 .  F3 .  C3 .  C3 .  G3 .  G2 .  C3 .  .  .
  `),
  noise: drums(`
    2010 1010 2010 1011
    2010 1010 2010 1011
    2010 1010 2010 1011
    2010 1010 2011 0000
  `),
};

/** Sneaky A-minor tiptoe for cavern levels. */
const TIPTOE_TUNNELS: Track = {
  name: 'Tiptoe Tunnels',
  bpm: 112,
  lead: notes(`
    A4 .  C5 .  E5 .  C5 .  B4 .  D5 .  B4 .  G4 .
    A4 .  C5 .  E5 .  A5 .  G5 E5 D5 C5 B4 .  E4 .
    A4 .  C5 .  E5 .  C5 .  F5 .  E5 .  D5 .  B4 .
    C5 D5 E5 .  A4 .  B4 .  A4 .  .  .  E4 .  A4 .
  `),
  harmony: notes(`
    .  .  A3 .  C4 .  A3 .  .  .  B3 .  G3 .  E3 .
    .  .  A3 .  C4 .  C5 .  E5 C5 B4 A4 G4 .  B3 .
    .  .  A3 .  C4 .  A3 .  D4 .  C4 .  B3 .  G3 .
    A3 B3 C4 .  E4 .  G4 .  E4 .  .  .  B3 .  C4 .
  `),
  bass: notes(`
    A2 .  .  .  A2 .  .  .  E2 .  .  .  E3 .  .  .
    A2 .  .  .  A2 .  .  .  G2 .  .  .  E2 .  .  .
    A2 .  .  .  A2 .  .  .  D3 .  .  .  E3 .  .  .
    F2 .  .  .  E2 .  .  .  A2 .  .  .  A2 .  E2 .
  `),
  noise: drums(`
    2000 1000 2000 1010
    2000 1000 2000 1010
    2000 1000 2000 1010
    2000 1000 2010 1010
  `),
};

/** Bouncy G-major romp for the green outdoors. */
const GREEN_FIELDS: Track = {
  name: 'Green Fields',
  bpm: 132,
  lead: notes(`
    G5 .  D5 .  B4 .  D5 .  G5 .  D5 .  B4 D5 G5 .
    A5 .  F#5 . D5 .  F#5 . A5 .  F#5 . D5 F#5 A5 .
    B5 .  G5 .  D5 .  G5 .  C6 .  A5 .  F#5 . D5 .
    G5 A5 B5 .  A5 G5 F#5 . G5 .  .  .  D5 .  G4 .
  `),
  harmony: notes(`
    B4 .  G4 .  D4 .  G4 .  B4 .  G4 .  D4 G4 B4 .
    D5 .  A4 .  F#4 . A4 .  D5 .  A4 .  F#4 A4 D5 .
    D5 .  B4 .  G4 .  B4 .  E5 .  C5 .  A4 .  F#4 .
    B4 C5 D5 .  C5 B4 A4 .  B4 .  .  .  A4 .  B3 .
  `),
  bass: notes(`
    G2 .  G3 .  G2 .  G3 .  G2 .  G3 .  G2 .  G3 .
    D3 .  D4 .  D3 .  D4 .  D3 .  D4 .  D3 .  D4 .
    G2 .  G3 .  G2 .  G3 .  A2 .  A3 .  D3 .  D4 .
    E3 .  E4 .  C3 .  D3 .  G2 .  G3 .  D3 .  G2 .
  `),
  noise: drums(`
    2010 1110 2010 1110
    2010 1110 2010 1110
    2010 1110 2010 1110
    2010 1110 2011 1000
  `),
};

export const TRACKS: Track[] = [MOB_MARCH, TIPTOE_TUNNELS, GREEN_FIELDS];
