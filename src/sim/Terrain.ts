/**
 * Cell materials. Solids support walking; water is a flowing hazard (not solid).
 * Carvability is separate (steel never; one-ways direction-aware; dirt/sand yes).
 */
export const MATERIAL = {
  empty: 0,
  dirt: 1,
  steel: 2,
  oneWayLeft: 3,
  oneWayRight: 4,
  sand: 5,
  water: 6,
  /** Buoyant solid — falls through air, rests on water (bridge material). */
  wood: 7,
} as const;

export type Material = (typeof MATERIAL)[keyof typeof MATERIAL];

/** Result of a carve: how many cells were removed, and whether any visited
 * solid cell refused to be carved (steel, or a one-way wall against the
 * carve direction) — callers use `blocked` for clank-and-stop feedback. */
export interface CarveResult {
  carved: number;
  blocked: boolean;
}

/** Direction of a carve: a basher's facing, or 0 for vertical/blast carves. */
export type CarveDirection = -1 | 0 | 1;

export type CarveLeaveAs = 'empty' | 'sand';

function isCarvable(material: number, direction: CarveDirection): boolean {
  if (material === MATERIAL.dirt || material === MATERIAL.sand || material === MATERIAL.wood) return true;
  if (material === MATERIAL.oneWayLeft) return direction <= 0;
  if (material === MATERIAL.oneWayRight) return direction >= 0;
  return false; // steel, water, empty
}

export function isLiquid(material: number): boolean {
  return material === MATERIAL.water;
}

export function isWalkSolid(material: number): boolean {
  return material !== MATERIAL.empty && !isLiquid(material);
}

export class Terrain {
  readonly width: number;
  readonly height: number;
  readonly cellSize: number;
  readonly cols: number;
  readonly rows: number;
  private readonly cells: Uint8Array;
  /** Set whenever cells change; the renderer clears it after a redraw. */
  private dirty = true;

  constructor(width: number, height: number, cellSize = 4) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.cols = Math.ceil(width / cellSize);
    this.rows = Math.ceil(height / cellSize);
    this.cells = new Uint8Array(this.cols * this.rows);
  }

  clone(): Terrain {
    const next = new Terrain(this.width, this.height, this.cellSize);
    next.cells.set(this.cells);
    next.dirty = true;
    return next;
  }

  isDirty(): boolean {
    return this.dirty;
  }

  consumeDirty(): boolean {
    const was = this.dirty;
    this.dirty = false;
    return was;
  }

  /** CA stepper calls this after swaps. */
  touchDirty(): void {
    this.dirty = true;
  }

  private markDirty(): void {
    this.dirty = true;
  }

  getCell(cellX: number, cellY: number): Material {
    if (!this.isCellInside(cellX, cellY)) return MATERIAL.empty;
    return this.cells[this.index(cellX, cellY)] as Material;
  }

  setCell(cellX: number, cellY: number, material: Material): void {
    if (!this.isCellInside(cellX, cellY)) return;
    this.cells[this.index(cellX, cellY)] = material;
    this.markDirty();
  }

  swapCells(ax: number, ay: number, bx: number, by: number): void {
    if (!this.isCellInside(ax, ay) || !this.isCellInside(bx, by)) return;
    const ia = this.index(ax, ay);
    const ib = this.index(bx, by);
    const tmp = this.cells[ia];
    this.cells[ia] = this.cells[ib];
    this.cells[ib] = tmp;
    this.markDirty();
  }

  fillRect(x: number, y: number, width: number, height: number, material: Material = MATERIAL.dirt): void {
    this.visitRect(x, y, width, height, (cellX, cellY) => {
      this.cells[this.index(cellX, cellY)] = material;
    });
    this.markDirty();
  }

  /** Unconditional erase — level authoring only. */
  eraseRect(x: number, y: number, width: number, height: number): void {
    this.visitRect(x, y, width, height, (cellX, cellY) => {
      this.cells[this.index(cellX, cellY)] = 0;
    });
    this.markDirty();
  }

  /**
   * Material-aware destruction. `leaveAs` controls what carved cells become:
   * empty (tunnels) or sand (bomb debris that then settles via CA).
   */
  carveRect(
    x: number,
    y: number,
    width: number,
    height: number,
    direction: CarveDirection,
    leaveAs: CarveLeaveAs = 'empty',
  ): CarveResult {
    const result: CarveResult = { carved: 0, blocked: false };
    this.visitRect(x, y, width, height, (cellX, cellY) => {
      this.carveCell(cellX, cellY, direction, result, leaveAs);
    });
    return result;
  }

  /** Material-aware blast. Bomber uses leaveAs 'sand' for debris. */
  carveCircle(x: number, y: number, radius: number, leaveAs: CarveLeaveAs = 'empty'): CarveResult {
    const result: CarveResult = { carved: 0, blocked: false };
    this.visitCircle(x, y, radius, (cellX, cellY) => {
      this.carveCell(cellX, cellY, 0, result, leaveAs);
    });
    return result;
  }

  /**
   * Spray sand into empty cells near a world point (dig debris that falls
   * without immediately refilling the tunnel the worker just carved).
   */
  emitSandDebris(worldX: number, worldY: number, count: number, pick: () => number): number {
    let placed = 0;
    const cs = this.cellSize;
    const originX = Math.floor(worldX / cs);
    const originY = Math.floor(worldY / cs);
    for (let i = 0; i < count * 4 && placed < count; i += 1) {
      const ox = originX + Math.floor(pick() * 7) - 3;
      const oy = originY + Math.floor(pick() * 5) - 4; // bias upward into air
      if (!this.isCellInside(ox, oy)) continue;
      if (this.getCell(ox, oy) !== MATERIAL.empty) continue;
      this.setCell(ox, oy, MATERIAL.sand);
      placed += 1;
    }
    return placed;
  }

  private carveCell(
    cellX: number,
    cellY: number,
    direction: CarveDirection,
    result: CarveResult,
    leaveAs: CarveLeaveAs,
  ): void {
    const index = this.index(cellX, cellY);
    const material = this.cells[index];
    if (material === MATERIAL.empty || material === MATERIAL.water) return;
    if (isCarvable(material, direction)) {
      this.cells[index] = leaveAs === 'sand' ? MATERIAL.sand : MATERIAL.empty;
      result.carved += 1;
      this.markDirty();
    } else {
      result.blocked = true;
    }
  }

  materialAt(x: number, y: number): Material {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    if (!this.isCellInside(cellX, cellY)) return MATERIAL.empty;
    return this.cells[this.index(cellX, cellY)] as Material;
  }

  eraseCircle(x: number, y: number, radius: number): void {
    this.visitCircle(x, y, radius, (cellX, cellY) => {
      this.cells[this.index(cellX, cellY)] = 0;
    });
    this.markDirty();
  }

  private visitCircle(x: number, y: number, radius: number, visitor: (cellX: number, cellY: number) => void): void {
    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.ceil((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize);
    const maxY = Math.ceil((y + radius) / this.cellSize);
    const radiusSq = radius * radius;

    for (let cellY = minY; cellY <= maxY; cellY += 1) {
      for (let cellX = minX; cellX <= maxX; cellX += 1) {
        if (!this.isCellInside(cellX, cellY)) continue;
        const centerX = cellX * this.cellSize + this.cellSize / 2;
        const centerY = cellY * this.cellSize + this.cellSize / 2;
        const distanceSq = (centerX - x) ** 2 + (centerY - y) ** 2;
        if (distanceSq <= radiusSq) {
          visitor(cellX, cellY);
        }
      }
    }
  }

  isSolidAt(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0) return false;
    if (y >= this.height) return true;
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return this.isCellSolid(cellX, cellY);
  }

  isWaterAt(x: number, y: number): boolean {
    return this.materialAt(x, y) === MATERIAL.water;
  }

  isCellSolid(cellX: number, cellY: number): boolean {
    if (!this.isCellInside(cellX, cellY)) return false;
    return isWalkSolid(this.cells[this.index(cellX, cellY)]);
  }

  solidCellCount(): number {
    let count = 0;
    for (const cell of this.cells) {
      if (isWalkSolid(cell)) count += 1;
    }
    return count;
  }

  /** All non-empty cells (including water) for rendering. */
  forEachSolidCell(visitor: (x: number, y: number, width: number, height: number, material: Material) => void): void {
    for (let y = 0; y < this.rows; y += 1) {
      for (let x = 0; x < this.cols; x += 1) {
        const material = this.cells[this.index(x, y)] as Material;
        if (material !== MATERIAL.empty) {
          visitor(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize, material);
        }
      }
    }
  }

  private visitRect(
    x: number,
    y: number,
    width: number,
    height: number,
    visitor: (cellX: number, cellY: number) => void,
  ): void {
    const minX = Math.floor(x / this.cellSize);
    const maxX = Math.ceil((x + width) / this.cellSize) - 1;
    const minY = Math.floor(y / this.cellSize);
    const maxY = Math.ceil((y + height) / this.cellSize) - 1;

    for (let cellY = minY; cellY <= maxY; cellY += 1) {
      for (let cellX = minX; cellX <= maxX; cellX += 1) {
        if (this.isCellInside(cellX, cellY)) {
          visitor(cellX, cellY);
        }
      }
    }
  }

  private isCellInside(cellX: number, cellY: number): boolean {
    return cellX >= 0 && cellX < this.cols && cellY >= 0 && cellY < this.rows;
  }

  private index(cellX: number, cellY: number): number {
    return cellY * this.cols + cellX;
  }
}
