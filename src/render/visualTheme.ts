export const WORLD_THEME = {
  sky: 0x050a14,
  skyBlue: 0x12345a,
  dirt: 0x3b241d,
  dirtMid: 0x583223,
  dirtDeep: 0x211316,
  dirtSpeck: 0x7b4930,
  moss: 0x6f842c,
  mossLight: 0xa6bb3f,
  steel: 0x4b6076,
  steelMid: 0x667e96,
  steelDark: 0x1e2a39,
  steelLight: 0xaec3d6,
  steelRust: 0x8c512c,
  sand: 0xdd991f,
  sandLight: 0xffd94d,
  sandDark: 0x9f5818,
  sandHot: 0xffef8a,
  water: 0x078bc5,
  waterDeep: 0x05395f,
  waterLight: 0x38dcff,
  waterFoam: 0xb2f7ff,
  wood: 0x98502d,
  woodDark: 0x481f19,
  woodLight: 0xd47a38,
  woodGold: 0xf0a54a,
  fire: 0xff4d1f,
  fireHot: 0xffc83d,
  fireCore: 0xfff0a3,
  mint: 0x78ffd6,
  cyan: 0x6ae1ff,
  danger: 0xff5b7f,
  ink: 0x050912,
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
