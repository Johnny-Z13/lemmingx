import type { WorkshopProjectId } from '../progress';

export interface WorkshopProject {
  id: WorkshopProjectId;
  name: string;
  cost: number;
  change: string;
  effect: string;
  tier: 1 | 2 | 3;
}

export const WORKSHOP_PROJECTS: readonly WorkshopProject[] = [
  {
    id: 'signal-lamp',
    name: 'Signal Lamp',
    cost: 18,
    change: 'Beacon tower relit',
    effect: 'Highlights one dangerous material relationship after failure.',
    tier: 1,
  },
  {
    id: 'crew-quarters',
    name: 'Crew Quarters',
    cost: 18,
    change: 'Bunkhouse opened',
    effect: 'Adds rescued residents to Workshop return scenes.',
    tier: 1,
  },
  {
    id: 'archive-scanner',
    name: 'Archive Scanner',
    cost: 20,
    change: 'Analysis table online',
    effect: 'Reveals a clue for every missing Atlas entry.',
    tier: 2,
  },
  {
    id: 'salvage-crane',
    name: 'Salvage Crane',
    cost: 22,
    change: 'Cargo track moving',
    effect: 'Raises away production from two hours to three.',
    tier: 2,
  },
  {
    id: 'paint-locker',
    name: 'Paint Locker',
    cost: 24,
    change: 'Colour bay restored',
    effect: 'Adds a bright cosmetic colour bay to the Workshop.',
    tier: 3,
  },
  {
    id: 'yard-gantry',
    name: 'Yard Gantry',
    cost: 24,
    change: 'Main gantry rebuilt',
    effect: 'Completes the yard and raises away production to four hours.',
    tier: 3,
  },
] as const;

export function workshopProjectAvailable(
  project: WorkshopProject,
  built: readonly WorkshopProjectId[],
): boolean {
  if (project.tier === 1) return true;
  if (project.tier === 2) return built.length >= 1;
  return built.length >= 3;
}

export interface AtlasEntry {
  id: string;
  name: string;
  clue: string;
}

export const ATLAS_ENTRIES: readonly AtlasEntry[] = [
  { id: 'blast-opens-floodgate', name: 'Floodgate Breach', clue: 'Bash dirt holding back a live reservoir.' },
  { id: 'wood-floats', name: 'Wood Floats', clue: 'Pour water beneath loose timber.' },
  { id: 'blast-carves-terrain', name: 'Crater Route', clue: 'Detonate a charge beside diggable ground.' },
  { id: 'steel-resists-tools', name: 'Steel Holds', clue: 'Strike steel with an excavation tool.' },
  { id: 'water-breaks-falls', name: 'Water Breaks Falls', clue: 'Land in deep water from a dangerous height.' },
  { id: 'fire-burns-crew', name: 'Living Flame', clue: 'Observe why the crew must avoid fire.' },
  { id: 'sand-smothers-fire', name: 'Sand Smothers Fire', clue: 'Drop moving sand onto flame.' },
  { id: 'water-quenches-fire', name: 'Water Quenches Fire', clue: 'Bring water into contact with flame.' },
  { id: 'fire-burns-wood', name: 'Fire Burns Timber', clue: 'Use fire to clear a wooden door.' },
  { id: 'swimmer-crosses-deep-water', name: 'Deep-Water Swimmer', clue: 'Send a trained swimmer through deep water.' },
  { id: 'climber-self-rescues', name: 'Climber Recovery', clue: 'Let a climber escape a steep water edge.' },
  { id: 'bomber-sinks', name: 'Heavy Fuse', clue: 'Arm a bomber before entering deep water.' },
  { id: 'sand-builds-ramp', name: 'Settled Ramp', clue: 'Pour sand until it forms a walkable slope.' },
  { id: 'wood-rides-water', name: 'Hydraulic Bridge', clue: 'Raise timber to meet two separated banks.' },
] as const;

export type DailyVariant = 'rescue' | 'perfect' | 'rush';

export interface DailyRescueDefinition {
  id: string;
  baseSite: number;
  variant: DailyVariant;
  title: string;
  rule: string;
  mastery: string;
}

const DAILY_BASES = [
  { baseSite: 0, name: 'Floodgate Shift' },
  { baseSite: 1, name: 'Timber Lock' },
  { baseSite: 2, name: 'Thin Wall' },
  { baseSite: 3, name: 'Long March' },
  { baseSite: 4, name: 'Steel Cut' },
  { baseSite: 6, name: 'Fire Doors' },
  { baseSite: 7, name: 'Mountain Cut' },
] as const;

export const DAILY_BASE_SITES = DAILY_BASES.map(({ baseSite }) => baseSite);

export const DAILY_RESCUES: readonly DailyRescueDefinition[] = DAILY_BASES.flatMap(
  ({ name, baseSite }) => ([
    {
      id: `${baseSite + 1}-rescue`,
      baseSite,
      variant: 'rescue' as const,
      title: `${name} · Rescue`,
      rule: 'Meet the rescue quota.',
      mastery: 'Save every crew member.',
    },
    {
      id: `${baseSite + 1}-perfect`,
      baseSite,
      variant: 'perfect' as const,
      title: `${name} · Perfect`,
      rule: 'No crew may be lost before quota.',
      mastery: 'Finish with zero losses.',
    },
    {
      id: `${baseSite + 1}-rush`,
      baseSite,
      variant: 'rush' as const,
      title: `${name} · Rush`,
      rule: 'Rescue before the mastery clock expires.',
      mastery: 'Clear in under two minutes.',
    },
  ]),
);

export function utcDateString(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function dailyForUtcDate(date: string): DailyRescueDefinition {
  const day = Math.floor(Date.parse(`${date}T00:00:00.000Z`) / 86_400_000);
  if (!Number.isFinite(day)) throw new Error(`Invalid UTC date: ${date}`);
  const index = ((day % DAILY_RESCUES.length) + DAILY_RESCUES.length) % DAILY_RESCUES.length;
  return DAILY_RESCUES[index];
}

export interface EconomyPath {
  campaignSalvage: number;
  atlasSalvage: number;
  dailySalvage: number;
  awaySalvage: number;
}

export function validateEconomyPath(path: EconomyPath): { total: number; firstChoiceReachable: boolean; awayDominant: boolean } {
  const total = path.campaignSalvage + path.atlasSalvage + path.dailySalvage + path.awaySalvage;
  return {
    total,
    firstChoiceReachable: total >= 18,
    awayDominant: path.awaySalvage >= 18 || path.awaySalvage > path.campaignSalvage,
  };
}
