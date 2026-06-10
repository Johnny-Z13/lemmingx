/**
 * Cell materials. Anything non-empty is solid for movement; carvability is a
 * separate question answered per-material (and, for one-way walls, per
 * carve direction — classic Lemmings arrows).
 */
export const MATERIAL = {
  empty: 0,
  dirt: 1,
  steel: 2,
  oneWayLeft: 3,
  oneWayRight: 4,
} as const;

export type Material = (typeof MATERIAL)[keyof typeof MATERIAL];

/** Result of a carve: how many cells were removed, and whether any visited
 * solid cell refused to be carved (steel, or a one-way wall against the
 * carve direction) — callers use `blocked` for clank-and-stop feedback. */
export interface CarveResult {
  carved: number;
  blocked: boolean;
}

/** Direction of a carve: a basher's facing, or 0 for vertical/blast carves
 * (diggers, miners' downward component, bomber craters) which pass one-way
 * walls but never steel. */
export type CarveDirection = -1 | 0 | 1;

function isCarvable(material: number, direction: CarveDirection): boolean {
  if (material === MATERIAL.dirt) return true;
  if (material === MATERIAL.oneWayLeft) return direction <= 0;
  if (material === MATERIAL.oneWayRight) return direction >= 0;
  return false; // steel (empty cells are skipped before this check)
}

export class Terrain {
  readonly width: number;
  readonly height: number;
  readonly cellSize: number;
  readonly cols: number;
  readonly rows: number;
  private readonly cells: Uint8Array;

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
    return next;
  }

  fillRect(x: number, y: number, width: number, height: number, material: Material = MATERIAL.dirt): void {
    this.visitRect(x, y, width, height, (cellX, cellY) => {
      this.cells[this.index(cellX, cellY)] = material;
    });
  }

  /** Unconditional erase — level authoring only. Gameplay destruction must go
   * through carveRect/carveCircle so steel and one-way walls are respected. */
  eraseRect(x: number, y: number, width: number, height: number): void {
    this.visitRect(x, y, width, height, (cellX, cellY) => {
      this.cells[this.index(cellX, cellY)] = 0;
    });
  }

  /** Material-aware destruction. Removes carvable cells in the rect; reports
   * whether anything solid refused to go (for clank-and-cancel feedback). */
  carveRect(x: number, y: number, width: number, height: number, direction: CarveDirection): CarveResult {
    const result: CarveResult = { carved: 0, blocked: false };
    this.visitRect(x, y, width, height, (cellX, cellY) => {
      this.carveCell(cellX, cellY, direction, result);
    });
    return result;
  }

  /** Material-aware blast (bomber craters): erases dirt and one-way walls,
   * never steel. */
  carveCircle(x: number, y: number, radius: number): CarveResult {
    const result: CarveResult = { carved: 0, blocked: false };
    this.visitCircle(x, y, radius, (cellX, cellY) => {
      this.carveCell(cellX, cellY, 0, result);
    });
    return result;
  }

  private carveCell(cellX: number, cellY: number, direction: CarveDirection, result: CarveResult): void {
    const index = this.index(cellX, cellY);
    const material = this.cells[index];
    if (material === MATERIAL.empty) return;
    if (isCarvable(material, direction)) {
      this.cells[index] = MATERIAL.empty;
      result.carved += 1;
    } else {
      result.blocked = true;
    }
  }

  /** Material at a world point; empty outside the bounds. */
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

  isCellSolid(cellX: number, cellY: number): boolean {
    if (!this.isCellInside(cellX, cellY)) return false;
    return this.cells[this.index(cellX, cellY)] !== MATERIAL.empty;
  }

  solidCellCount(): number {
    let count = 0;
    for (const cell of this.cells) {
      if (cell !== MATERIAL.empty) count += 1;
    }
    return count;
  }

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
