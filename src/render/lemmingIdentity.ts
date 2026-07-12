import type { Lemming, LemmingState, Skill } from '../sim/types';

const CREW_NAMES = [
  'Milo', 'Pip', 'Nori', 'Bram', 'Tavi',
  'Lumi', 'Otis', 'Kiko', 'Marn', 'Ziggy',
  'Bea', 'Rook', 'Nell', 'Cosmo', 'Fenn',
  'Ivy', 'Moss', 'Puck', 'Rin', 'Sol',
] as const;

export type CrewRole =
  | 'Walker'
  | 'Climber'
  | 'Floater'
  | 'Bomber'
  | 'Blocker'
  | 'Builder'
  | 'Basher'
  | 'Miner'
  | 'Digger'
  | 'Swimmer';

export interface CrewPalette {
  readonly hair: number;
  readonly body: number;
  readonly bodyShade: number;
  readonly trim: number;
}

/** High-contrast role uniforms; colour is display-only and never enters sim state. */
const ROLE_PALETTES: Record<CrewRole, CrewPalette> = {
  Walker:  { hair: 0x5ef2a1, body: 0x3f62d9, bodyShade: 0x2846a5, trim: 0xa7ffd0 },
  Climber: { hair: 0xffd24d, body: 0x9a5a10, bodyShade: 0x643706, trim: 0xfff0a3 },
  Floater: { hair: 0xff7aa8, body: 0x9b4dca, bodyShade: 0x67318f, trim: 0xffb3ce },
  Bomber:  { hair: 0xff7a3a, body: 0xe34b35, bodyShade: 0x9c2c27, trim: 0xfff3a3 },
  Blocker: { hair: 0xff5b7f, body: 0x8f294f, bodyShade: 0x5e1836, trim: 0xffb2c3 },
  Builder: { hair: 0x6ae1ff, body: 0x217c91, bodyShade: 0x155363, trim: 0xc4f6ff },
  Basher:  { hair: 0xffa24d, body: 0xb34b1e, bodyShade: 0x713014, trim: 0xffdab6 },
  Miner:   { hair: 0xd1b07b, body: 0x6d5a47, bodyShade: 0x46382c, trim: 0xf2d7a8 },
  Digger:  { hair: 0xd696ff, body: 0x704bb8, bodyShade: 0x472f7b, trim: 0xefd5ff },
  Swimmer: { hair: 0x2ee6c8, body: 0x1477a6, bodyShade: 0x0c4c6d, trim: 0xa8fff0 },
};

const SKILL_ROLES: Record<Skill, CrewRole> = {
  climber: 'Climber',
  floater: 'Floater',
  bomber: 'Bomber',
  blocker: 'Blocker',
  builder: 'Builder',
  basher: 'Basher',
  miner: 'Miner',
  digger: 'Digger',
  swimmer: 'Swimmer',
};

const STATE_LABELS: Record<LemmingState, string> = {
  walker: 'Walking',
  faller: 'Falling',
  climber: 'Climbing',
  blocker: 'Blocking',
  builder: 'Building',
  basher: 'Bashing',
  miner: 'Mining',
  digger: 'Digging',
  treading: 'Treading',
  swimming: 'Swimming',
  shrug: 'Shrugging',
  exited: 'Saved',
  dead: 'Dead',
};

const ACTIVE_ROLES: Partial<Record<LemmingState, CrewRole>> = {
  blocker: 'Blocker',
  builder: 'Builder',
  basher: 'Basher',
  miner: 'Miner',
  digger: 'Digger',
};

export function crewName(id: number): string {
  return CREW_NAMES[Math.max(0, id - 1) % CREW_NAMES.length];
}

export function crewRole(lemming: Lemming): CrewRole {
  if (lemming.fuseMs !== null) return 'Bomber';
  const active = ACTIVE_ROLES[lemming.state];
  if (active) return active;
  if (lemming.pendingHatchSkill) return SKILL_ROLES[lemming.pendingHatchSkill];
  if (lemming.isSwimmer) return 'Swimmer';
  if (lemming.isClimber) return 'Climber';
  if (lemming.isFloater) return 'Floater';
  return 'Walker';
}

export function crewState(lemming: Lemming): string {
  return STATE_LABELS[lemming.state];
}

/** One compact debug line: deterministic name, assigned role, live state. */
export function crewLabel(lemming: Lemming): string {
  return `${crewName(lemming.id)} · ${crewRole(lemming)} · ${crewState(lemming)}`;
}

/** Full uniform palette for the assigned role; armed bombers take priority. */
export function crewPalette(lemming: Lemming): CrewPalette {
  return ROLE_PALETTES[crewRole(lemming)];
}

/** Palette used by the HUD icon for the same role the hatch skill creates. */
export function skillPalette(skill: Skill): CrewPalette {
  return ROLE_PALETTES[SKILL_ROLES[skill]];
}

/** Compact colour key shared by sprite hair, labels, and leader lines. */
export function crewColor(lemming: Lemming): number {
  return crewPalette(lemming).hair;
}

export function colorToCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
