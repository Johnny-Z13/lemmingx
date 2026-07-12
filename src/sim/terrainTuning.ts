/** Central tuning for destructive and reactive living-terrain effects. */
export const EXPLOSION_TUNING = {
  /** World-space radius shared by crew bombers and the landscape bomb tool. */
  blastRadius: 32,
  /** Fraction of destroyed cells thrown back as falling sand; the rest is gone. */
  debrisRatio: 0.22,
  /** Short-lived flames thrown into the crater; nearby wood sustains the fire. */
  fireSeeds: 12,
} as const;

export const FIRE_TUNING = {
  /** Small ignition cluster per brush stamp; spread does the actual burning. */
  brushSeeds: 6,
  /** Per-pass burnout chance: roughly 180 active CA passes without fresh fuel. */
  burnoutChance: 1 / 180,
  /** Per-pass chance to consume one adjacent wood cell. Uses the seeded CA RNG. */
  spreadChance: 0.016,
  /** Per-pass upward/sideways movement chances for free flames. */
  riseChance: 0.16,
  driftChance: 0.06,
} as const;
