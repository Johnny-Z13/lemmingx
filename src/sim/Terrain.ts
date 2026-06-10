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

  fillRect(x: number, y: number, width: number, height: number): void {
    this.visitRect(x, y, width, height, (cellX, cellY) => {
      this.cells[this.index(cellX, cellY)] = 1;
    });
  }

  eraseRect(x: number, y: number, width: number, height: number): void {
    this.visitRect(x, y, width, height, (cellX, cellY) => {
      this.cells[this.index(cellX, cellY)] = 0;
    });
  }

  eraseCircle(x: number, y: number, radius: number): void {
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
          this.cells[this.index(cellX, cellY)] = 0;
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
    return this.cells[this.index(cellX, cellY)] === 1;
  }

  solidCellCount(): number {
    let count = 0;
    for (const cell of this.cells) {
      count += cell;
    }
    return count;
  }

  forEachSolidCell(visitor: (x: number, y: number, width: number, height: number) => void): void {
    for (let y = 0; y < this.rows; y += 1) {
      for (let x = 0; x < this.cols; x += 1) {
        if (this.isCellSolid(x, y)) {
          visitor(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
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
