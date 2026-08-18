export type Site2PourChoice = 'quick-lift' | 'high-water';

export interface Site2PourZone {
  readonly id: Site2PourChoice;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly paintRadius: number;
}

/**
 * Two intentionally broad Site 2 targets. Both feed the same deterministic
 * hydraulic lock, while their position and water volume make the early lift
 * visibly different. This is a prediction lesson, not a precision test.
 */
export const SITE2_POUR_ZONES: readonly Site2PourZone[] = [
  {
    id: 'quick-lift',
    label: 'QUICK LIFT',
    x: 486,
    y: 372,
    width: 48,
    height: 44,
    paintRadius: 54,
  },
  {
    id: 'high-water',
    label: 'HIGH WATER',
    x: 486,
    y: 416,
    width: 48,
    height: 44,
    paintRadius: 66,
  },
] as const;

export function site2PourZoneAt(x: number, y: number): Site2PourZone | null {
  return SITE2_POUR_ZONES.find((zone) =>
    x >= zone.x && x <= zone.x + zone.width && y >= zone.y && y <= zone.y + zone.height
  ) ?? null;
}
