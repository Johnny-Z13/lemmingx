export const WORLD_THEME = {
  sky: 0x0d1117,
  skyBlue: 0x142033,
  dirt: 0x35281f,
  dirtDeep: 0x241a17,
  dirtSpeck: 0x49352a,
  moss: 0x62743b,
  mossLight: 0x85944b,
  steel: 0x66717f,
  steelDark: 0x343d49,
  steelLight: 0x9ba7b4,
  sand: 0xd4a84a,
  sandLight: 0xf0cd72,
  sandDark: 0x9c7332,
  water: 0x247ba4,
  waterDeep: 0x155274,
  waterLight: 0x73d5eb,
  wood: 0x7a4c2d,
  woodDark: 0x4a2c21,
  woodLight: 0xb87842,
  fire: 0xff6a2a,
  fireHot: 0xffd96b,
  mint: 0x78ffd6,
  cyan: 0x6ae1ff,
  danger: 0xff5b7f,
  ink: 0x0b0f16,
} as const;

/** Stable render-only variation. Never consumes either simulation RNG stream. */
export function visualHash(cellX: number, cellY: number, salt = 0): number {
  let value = Math.imul(cellX + 17 + salt, 0x45d9f3b) ^ Math.imul(cellY + 31, 0x27d4eb2d);
  value ^= value >>> 16;
  return value >>> 0;
}

export function isVisualSurface(materialAbove: number): boolean {
  return materialAbove === 0 || materialAbove === 6 || materialAbove === 8;
}
