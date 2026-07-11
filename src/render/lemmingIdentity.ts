import type { Lemming, LemmingState } from '../sim/types';

const CREW_NAMES = [
  'Milo', 'Pip', 'Nori', 'Bram', 'Tavi',
  'Lumi', 'Otis', 'Kiko', 'Marn', 'Ziggy',
  'Bea', 'Rook', 'Nell', 'Cosmo', 'Fenn',
  'Ivy', 'Moss', 'Puck', 'Rin', 'Sol',
] as const;

const STATE_COLORS: Record<LemmingState, number> = {
  walker: 0x5ef2a1,
  faller: 0xffe06b,
  climber: 0xffd24d,
  blocker: 0xff5b7f,
  builder: 0x6ae1ff,
  basher: 0xffa24d,
  miner: 0xc4a06a,
  digger: 0xd696ff,
  treading: 0x4ab6ff,
  swimming: 0x2ee6c8,
  shrug: 0xff9ec8,
  exited: 0x78ffd6,
  dead: 0x6a7283,
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
  dead: 'Down',
};

const ACTIVE_ROLES: Partial<Record<LemmingState, string>> = {
  blocker: 'Blocker',
  builder: 'Builder',
  basher: 'Basher',
  miner: 'Miner',
  digger: 'Digger',
};

export function crewName(id: number): string {
  return CREW_NAMES[Math.max(0, id - 1) % CREW_NAMES.length];
}

export function crewRole(lemming: Lemming): string {
  if (lemming.fuseMs !== null) return 'Bomber';
  const active = ACTIVE_ROLES[lemming.state];
  if (active) return active;
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

/** Armed bombers take priority; otherwise colour follows the live state. */
export function crewColor(lemming: Lemming): number {
  return lemming.fuseMs !== null ? 0xff7a3a : STATE_COLORS[lemming.state];
}

export function colorToCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
