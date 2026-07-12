import { MATERIAL, type Terrain } from '../Terrain';
import { FIRE_TUNING } from '../terrainTuning';
import type { SeededRng } from './SeededRng';

const CHUNK = 16;

/**
 * Cellular-automata stepper for living terrain (sand powder, water liquid,
 * buoyant wood, rising fire, optional dirt stability). All stochastic choices
 * use the seeded RNG.
 */
export class ChunkStepper {
  private readonly cols: number;
  private readonly rows: number;
  private readonly chunkCols: number;
  private readonly chunkRows: number;
  /** Bitset of chunks that need a pass. */
  private readonly active: Uint8Array;
  private xOrder: number[];

  constructor(
    private readonly terrain: Terrain,
    private readonly rng: SeededRng,
  ) {
    this.cols = terrain.cols;
    this.rows = terrain.rows;
    this.chunkCols = Math.ceil(this.cols / CHUNK);
    this.chunkRows = Math.ceil(this.rows / CHUNK);
    this.active = new Uint8Array(this.chunkCols * this.chunkRows);
    this.xOrder = Array.from({ length: this.cols }, (_, i) => i);
    this.scanMobile();
  }

  /** Wake chunks that already contain living materials (level start). */
  scanMobile(): void {
    for (let y = 0; y < this.rows; y += 1) {
      for (let x = 0; x < this.cols; x += 1) {
        const m = this.terrain.getCell(x, y);
        if (m === MATERIAL.sand || m === MATERIAL.water || m === MATERIAL.wood || m === MATERIAL.fire) {
          this.markCell(x, y);
        }
      }
    }
  }

  /** Force every chunk active (reseed / tests). */
  markAll(): void {
    this.active.fill(1);
  }

  markWorldRect(x: number, y: number, width: number, height: number): void {
    const cs = this.terrain.cellSize;
    const minX = Math.max(0, Math.floor(x / cs) - 1);
    const maxX = Math.min(this.cols - 1, Math.ceil((x + width) / cs));
    const minY = Math.max(0, Math.floor(y / cs) - 1);
    const maxY = Math.min(this.rows - 1, Math.ceil((y + height) / cs));
    for (let cy = Math.floor(minY / CHUNK); cy <= Math.floor(maxY / CHUNK); cy += 1) {
      for (let cx = Math.floor(minX / CHUNK); cx <= Math.floor(maxX / CHUNK); cx += 1) {
        this.active[cy * this.chunkCols + cx] = 1;
      }
    }
  }

  private markCell(cellX: number, cellY: number): void {
    if (cellX < 0 || cellY < 0 || cellX >= this.cols || cellY >= this.rows) return;
    this.active[Math.floor(cellY / CHUNK) * this.chunkCols + Math.floor(cellX / CHUNK)] = 1;
    // Neighbors may need wake-up next frame.
    for (const [dx, dy] of [
      [0, -1],
      [-1, -1],
      [1, -1],
      [-1, 0],
      [1, 0],
    ] as const) {
      const nx = cellX + dx;
      const ny = cellY + dy;
      if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows) continue;
      this.active[Math.floor(ny / CHUNK) * this.chunkCols + Math.floor(nx / CHUNK)] = 1;
    }
  }

  /** Run `substeps` CA passes. Returns living-cell changes/activity. */
  step(substeps: number, stabilityThreshold = 0): number {
    if (!this.hasActive()) return 0;
    let moved = 0;
    for (let s = 0; s < substeps; s += 1) {
      this.shuffleX();
      moved += this.pass(stabilityThreshold);
      if (!this.hasActive()) break;
    }
    return moved;
  }

  private hasActive(): boolean {
    for (let i = 0; i < this.active.length; i += 1) {
      if (this.active[i]) return true;
    }
    return false;
  }

  /** Keep stepping until quiet or maxPasses (for tests / settle). */
  settleUntilQuiet(maxPasses = 400, stabilityThreshold = 0): number {
    let total = 0;
    for (let i = 0; i < maxPasses; i += 1) {
      const n = this.step(1, stabilityThreshold);
      total += n;
      if (n === 0) break;
    }
    return total;
  }

  private shuffleX(): void {
    for (let i = this.xOrder.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.rng.next() * (i + 1));
      const tmp = this.xOrder[i];
      this.xOrder[i] = this.xOrder[j];
      this.xOrder[j] = tmp;
    }
  }

  private pass(stabilityThreshold: number): number {
    let moved = 0;
    const nextActive = new Uint8Array(this.active.length);

    // Bottom → top so powders fall multiple cells per multi-substep call.
    for (let cellY = this.rows - 1; cellY >= 0; cellY -= 1) {
      const chunkY = Math.floor(cellY / CHUNK);
      for (const cellX of this.xOrder) {
        const chunkX = Math.floor(cellX / CHUNK);
        if (!this.active[chunkY * this.chunkCols + chunkX]) continue;

        const mat = this.terrain.getCell(cellX, cellY);
        if (mat === MATERIAL.sand) {
          if (this.stepSand(cellX, cellY)) {
            moved += 1;
            this.wake(nextActive, cellX, cellY);
          }
        } else if (mat === MATERIAL.wood) {
          if (this.stepWood(cellX, cellY)) {
            moved += 1;
            this.wake(nextActive, cellX, cellY);
          }
        } else if (mat === MATERIAL.water) {
          if (this.stepWater(cellX, cellY)) {
            moved += 1;
            this.wake(nextActive, cellX, cellY);
          }
        } else if (mat === MATERIAL.dirt && stabilityThreshold > 0) {
          if (this.stepStability(cellX, cellY, stabilityThreshold)) {
            moved += 1;
            this.wake(nextActive, cellX, cellY);
          }
        }
      }
    }

    // Fire runs top → bottom after falling materials. Snapshot first so flames
    // created during this pass cannot chain across an entire timber pile at once.
    const fires: Array<readonly [number, number]> = [];
    for (let cellY = 0; cellY < this.rows; cellY += 1) {
      const chunkY = Math.floor(cellY / CHUNK);
      for (const cellX of this.xOrder) {
        const chunkX = Math.floor(cellX / CHUNK);
        if (!this.active[chunkY * this.chunkCols + chunkX]) continue;
        if (this.terrain.getCell(cellX, cellY) === MATERIAL.fire) fires.push([cellX, cellY]);
      }
    }
    for (const [cellX, cellY] of fires) {
      if (this.terrain.getCell(cellX, cellY) !== MATERIAL.fire) continue;
      this.stepFire(cellX, cellY);
      moved += 1; // keeps stationary flames active until they burn out
      this.wake(nextActive, cellX, cellY);
    }

    this.active.set(nextActive);
    if (moved > 0) this.terrain.touchDirty();
    return moved;
  }

  private wake(next: Uint8Array, cellX: number, cellY: number): void {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const nx = cellX + dx;
        const ny = cellY + dy;
        if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows) continue;
        next[Math.floor(ny / CHUNK) * this.chunkCols + Math.floor(nx / CHUNK)] = 1;
      }
    }
  }

  private stepSand(x: number, y: number): boolean {
    // Down
    if (this.terrain.getCell(x, y + 1) === MATERIAL.empty) {
      this.terrain.swapCells(x, y, x, y + 1);
      return true;
    }
    // Falling sand smothers fire rather than balancing on hot gas.
    if (this.terrain.getCell(x, y + 1) === MATERIAL.fire) {
      this.terrain.setCell(x, y, MATERIAL.empty);
      this.terrain.setCell(x, y + 1, MATERIAL.sand);
      return true;
    }
    // Displace water below (sand sinks)
    if (this.terrain.getCell(x, y + 1) === MATERIAL.water) {
      this.terrain.swapCells(x, y, x, y + 1);
      return true;
    }
    const dir = this.rng.sign();
    if (this.trySandDiag(x, y, dir)) return true;
    if (this.trySandDiag(x, y, -dir as -1 | 1)) return true;
    return false;
  }

  private trySandDiag(x: number, y: number, dir: -1 | 1): boolean {
    const nx = x + dir;
    const below = this.terrain.getCell(nx, y + 1);
    if (below === MATERIAL.fire) {
      this.terrain.setCell(x, y, MATERIAL.empty);
      this.terrain.setCell(nx, y + 1, MATERIAL.sand);
      return true;
    }
    if (below === MATERIAL.empty || below === MATERIAL.water) {
      this.terrain.swapCells(x, y, nx, y + 1);
      return true;
    }
    return false;
  }

  /**
   * Wood: falls through air, rests on water (does not sink), rises when submerged.
   * Adjacent water can seep under wood on a solid floor and lift it — the
   * campaign "paint water → float a wood bridge" puzzle hook.
   */
  private stepWood(x: number, y: number): boolean {
    const below = this.terrain.getCell(x, y + 1);
    const above = this.terrain.getCell(x, y - 1);

    // Fall through air.
    if (below === MATERIAL.empty) {
      this.terrain.swapCells(x, y, x, y + 1);
      return true;
    }

    // Rise through water toward the surface (submerged).
    if (above === MATERIAL.water) {
      this.terrain.swapCells(x, y, x, y - 1);
      return true;
    }

    // Rest on the water surface (water below, air above) — do not fly upward.
    if (below === MATERIAL.water && above === MATERIAL.empty) {
      return false;
    }

    // Water beside wood on a solid floor seeps underneath and lifts the timber.
    if (
      above === MATERIAL.empty &&
      below !== MATERIAL.water &&
      (this.terrain.getCell(x - 1, y) === MATERIAL.water ||
        this.terrain.getCell(x + 1, y) === MATERIAL.water)
    ) {
      this.terrain.setCell(x, y - 1, MATERIAL.wood);
      this.terrain.setCell(x, y, MATERIAL.water);
      return true;
    }

    const dir = this.rng.sign();
    if (this.tryWoodDiag(x, y, dir)) return true;
    if (this.tryWoodDiag(x, y, -dir as -1 | 1)) return true;
    return false;
  }

  private tryWoodDiag(x: number, y: number, dir: -1 | 1): boolean {
    const nx = x + dir;
    const below = this.terrain.getCell(nx, y + 1);
    if (below === MATERIAL.empty) {
      this.terrain.swapCells(x, y, nx, y + 1);
      return true;
    }
    return false;
  }

  private stepWater(x: number, y: number): boolean {
    const below = this.terrain.getCell(x, y + 1);
    if (below === MATERIAL.empty) {
      this.terrain.swapCells(x, y, x, y + 1);
      return true;
    }
    if (below === MATERIAL.fire) {
      this.terrain.setCell(x, y, MATERIAL.empty);
      this.terrain.setCell(x, y + 1, MATERIAL.water);
      return true;
    }
    const dir = this.rng.sign();
    const dispersion = 3;
    for (let i = 1; i <= dispersion; i += 1) {
      const nx = x + dir * i;
      const material = this.terrain.getCell(nx, y);
      if (material === MATERIAL.empty) {
        this.terrain.swapCells(x, y, nx, y);
        return true;
      }
      if (material === MATERIAL.fire) {
        this.terrain.setCell(x, y, MATERIAL.empty);
        this.terrain.setCell(nx, y, MATERIAL.water);
        return true;
      }
      if (material !== MATERIAL.water) break;
    }
    for (let i = 1; i <= dispersion; i += 1) {
      const nx = x - dir * i;
      const material = this.terrain.getCell(nx, y);
      if (material === MATERIAL.empty) {
        this.terrain.swapCells(x, y, nx, y);
        return true;
      }
      if (material === MATERIAL.fire) {
        this.terrain.setCell(x, y, MATERIAL.empty);
        this.terrain.setCell(nx, y, MATERIAL.water);
        return true;
      }
      if (material !== MATERIAL.water) break;
    }
    return false;
  }

  /** Fire consumes wood, rises through air, and vanishes instantly beside water. */
  private stepFire(x: number, y: number): void {
    const neighbors = [
      [x, y - 1],
      [x - 1, y],
      [x + 1, y],
      [x, y + 1],
    ] as const;
    if (neighbors.some(([nx, ny]) => this.terrain.getCell(nx, ny) === MATERIAL.water)) {
      this.terrain.setCell(x, y, MATERIAL.empty);
      return;
    }

    const fuel = neighbors.filter(([nx, ny]) => this.terrain.getCell(nx, ny) === MATERIAL.wood);
    if (fuel.length > 0) {
      if (this.rng.next() < FIRE_TUNING.spreadChance) {
        const [fx, fy] = fuel[Math.floor(this.rng.next() * fuel.length)];
        this.terrain.setCell(fx, fy, MATERIAL.fire);
      }
      return; // cling to nearby fuel instead of floating away
    }

    if (this.rng.next() < FIRE_TUNING.burnoutChance || y <= 0) {
      this.terrain.setCell(x, y, MATERIAL.empty);
      return;
    }
    if (this.terrain.getCell(x, y - 1) === MATERIAL.empty && this.rng.next() < FIRE_TUNING.riseChance) {
      this.terrain.swapCells(x, y, x, y - 1);
      return;
    }
    if (this.rng.next() < FIRE_TUNING.driftChance) {
      const dir = this.rng.sign();
      if (this.terrain.getCell(x + dir, y) === MATERIAL.empty) {
        this.terrain.swapCells(x, y, x + dir, y);
      }
    }
  }

  /** Undercut dirt with too few solid (non-water) neighbors becomes sand. */
  private stepStability(x: number, y: number, threshold: number): boolean {
    let support = 0;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        if (this.terrain.isCellSolid(x + dx, y + dy)) support += 1;
      }
    }
    if (support < threshold) {
      this.terrain.setCell(x, y, MATERIAL.sand);
      this.markCell(x, y);
      return true;
    }
    return false;
  }
}
