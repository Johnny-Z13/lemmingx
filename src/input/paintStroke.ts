export interface StrokePoint {
  x: number;
  y: number;
}

/** Fill sparse touch/pointer moves with evenly spaced paint stamps. */
export function interpolatePaintStroke(
  from: StrokePoint,
  to: StrokePoint,
  spacing: number,
): StrokePoint[] {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  if (!(spacing > 0) || distance < spacing) return [];
  const count = Math.floor(distance / spacing);
  const unitX = (to.x - from.x) / distance;
  const unitY = (to.y - from.y) / distance;
  return Array.from({ length: count }, (_, index) => ({
    x: from.x + unitX * spacing * (index + 1),
    y: from.y + unitY * spacing * (index + 1),
  }));
}
