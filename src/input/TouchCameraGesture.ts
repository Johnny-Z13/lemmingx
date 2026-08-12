export interface TouchPoint {
  x: number;
  y: number;
}

export type TouchCameraMove =
  | { owned: false }
  | {
      owned: true;
      previousCenter?: TouchPoint;
      currentCenter?: TouchPoint;
      scale?: number;
    };

/** Owns a gesture from the second touch until every participating touch lifts. */
export class TouchCameraGesture {
  private readonly points = new Map<number, TouchPoint>();
  private owned = false;
  private pinch: { center: TouchPoint; distance: number } | null = null;

  begin(id: number, point: TouchPoint): boolean {
    this.points.set(id, point);
    if (this.points.size < 2) return false;
    this.owned = true;
    this.resetPinchBaseline();
    return true;
  }

  move(id: number, point: TouchPoint): TouchCameraMove {
    if (!this.points.has(id)) return { owned: false };
    this.points.set(id, point);
    if (!this.owned) return { owned: false };

    const [a, b] = [...this.points.values()];
    if (!a || !b || !this.pinch) return { owned: true };
    const currentCenter = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
    const result: TouchCameraMove = {
      owned: true,
      previousCenter: this.pinch.center,
      currentCenter,
      scale: distance / this.pinch.distance,
    };
    this.pinch = { center: currentCenter, distance };
    return result;
  }

  end(id: number): boolean {
    if (!this.points.has(id)) return false;
    const consumed = this.owned;
    this.points.delete(id);
    this.pinch = null;
    if (this.points.size >= 2) this.resetPinchBaseline();
    if (this.points.size === 0) this.owned = false;
    return consumed;
  }

  reset(): void {
    this.points.clear();
    this.owned = false;
    this.pinch = null;
  }

  private resetPinchBaseline(): void {
    const [a, b] = [...this.points.values()];
    if (!a || !b) return;
    this.pinch = {
      center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
    };
  }
}
