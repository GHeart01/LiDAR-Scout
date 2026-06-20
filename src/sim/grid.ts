import { Vec2 } from "./constants";

export type CellState = 0 | 1 | 2; // 0 unknown, 1 free, 2 occupied

export interface Cell {
  cx: number;
  cz: number;
}

// A square occupancy grid covering [-arena, arena] on both axes. Shared by all
// robots so they collaboratively build one map.
export class OccupancyGrid {
  readonly n: number;
  readonly cell: number;
  readonly arena: number;
  readonly data: Uint8Array;
  /** Set whenever a cell changes; renderers use it to know when to refresh. */
  dirty = true;

  constructor(arena: number, cell: number) {
    this.arena = arena;
    this.cell = cell;
    this.n = Math.ceil((arena * 2) / cell);
    this.data = new Uint8Array(this.n * this.n);
  }

  index(cx: number, cz: number): number {
    return cz * this.n + cx;
  }

  inBounds(cx: number, cz: number): boolean {
    return cx >= 0 && cz >= 0 && cx < this.n && cz < this.n;
  }

  worldToCell(x: number, z: number): Cell {
    return {
      cx: Math.floor((x + this.arena) / this.cell),
      cz: Math.floor((z + this.arena) / this.cell),
    };
  }

  cellCenter(cx: number, cz: number): Vec2 {
    return {
      x: -this.arena + (cx + 0.5) * this.cell,
      z: -this.arena + (cz + 0.5) * this.cell,
    };
  }

  // Out-of-bounds reads as occupied so planners treat the boundary as a wall.
  get(cx: number, cz: number): CellState {
    if (!this.inBounds(cx, cz)) return 2;
    return this.data[this.index(cx, cz)] as CellState;
  }

  setFree(cx: number, cz: number): void {
    if (!this.inBounds(cx, cz)) return;
    const i = this.index(cx, cz);
    if (this.data[i] === 0) {
      this.data[i] = 1;
      this.dirty = true;
    }
  }

  setOccupied(cx: number, cz: number): void {
    if (!this.inBounds(cx, cz)) return;
    const i = this.index(cx, cz);
    if (this.data[i] !== 2) {
      this.data[i] = 2;
      this.dirty = true;
    }
  }

  // March a ray (world coords) marking visited cells free, the hit cell occupied.
  trace(ox: number, oz: number, ax: number, az: number, endDist: number, hit: boolean): void {
    const step = this.cell * 0.5;
    const count = Math.floor(endDist / step);
    let last = -1;
    for (let s = 1; s <= count; s++) {
      const dd = s * step;
      const { cx, cz } = this.worldToCell(ox + ax * dd, oz + az * dd);
      if (!this.inBounds(cx, cz)) break;
      const idx = this.index(cx, cz);
      if (idx !== last) {
        this.setFree(cx, cz);
        last = idx;
      }
    }
    if (hit) {
      const { cx, cz } = this.worldToCell(ox + ax * endDist, oz + az * endDist);
      this.setOccupied(cx, cz);
    }
  }

  // Free cells that border at least one in-bounds unknown cell — the frontier
  // between explored and unexplored space.
  frontiers(): number[] {
    const out: number[] = [];
    const n = this.n;
    for (let cz = 0; cz < n; cz++) {
      for (let cx = 0; cx < n; cx++) {
        if (this.data[this.index(cx, cz)] !== 1) continue;
        if (
          (this.inBounds(cx + 1, cz) && this.data[this.index(cx + 1, cz)] === 0) ||
          (this.inBounds(cx - 1, cz) && this.data[this.index(cx - 1, cz)] === 0) ||
          (this.inBounds(cx, cz + 1) && this.data[this.index(cx, cz + 1)] === 0) ||
          (this.inBounds(cx, cz - 1) && this.data[this.index(cx, cz - 1)] === 0)
        ) {
          out.push(this.index(cx, cz));
        }
      }
    }
    return out;
  }

  // Fraction of in-bounds cells that have been observed (free or occupied).
  coverage(): number {
    let known = 0;
    for (let i = 0; i < this.data.length; i++) if (this.data[i] !== 0) known++;
    return known / this.data.length;
  }

  clear(): void {
    this.data.fill(0);
    this.dirty = true;
  }
}
