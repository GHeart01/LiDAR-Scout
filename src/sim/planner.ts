import { OccupancyGrid, Cell } from "./grid";

interface Options {
  allowUnknown?: boolean; // let paths cross unobserved cells (optimistic)
}

// A* over the occupancy grid with 8-connectivity and an octile heuristic.
// Occupied cells (and the boundary) are impassable; unknown cells are blocked
// unless `allowUnknown` is set. Returns the cell path (inclusive) or null.
export function aStar(
  grid: OccupancyGrid,
  start: Cell,
  goal: Cell,
  opts: Options = {}
): Cell[] | null {
  const n = grid.n;
  const startIdx = grid.index(start.cx, start.cz);
  const goalIdx = grid.index(goal.cx, goal.cz);

  const passable = (cx: number, cz: number): boolean => {
    const s = grid.get(cx, cz);
    if (s === 2) return false;
    if (s === 0) return !!opts.allowUnknown;
    return true;
  };

  if (!grid.inBounds(start.cx, start.cz) || !grid.inBounds(goal.cx, goal.cz)) return null;
  if (grid.get(goal.cx, goal.cz) === 2) return null;

  const h = (cx: number, cz: number): number => {
    const dx = Math.abs(cx - goal.cx);
    const dz = Math.abs(cz - goal.cz);
    return (dx + dz) + (Math.SQRT2 - 2) * Math.min(dx, dz);
  };

  const gScore = new Float64Array(n * n).fill(Infinity);
  const cameFrom = new Int32Array(n * n).fill(-1);
  const closed = new Uint8Array(n * n);

  // Tiny binary heap keyed by f-score.
  const heap: number[] = []; // cell indices
  const fOf = new Float64Array(n * n).fill(Infinity);
  const push = (idx: number) => {
    heap.push(idx);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (fOf[heap[p]] <= fOf[heap[i]]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = (): number => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        let s = i;
        if (l < heap.length && fOf[heap[l]] < fOf[heap[s]]) s = l;
        if (r < heap.length && fOf[heap[r]] < fOf[heap[s]]) s = r;
        if (s === i) break;
        [heap[s], heap[i]] = [heap[i], heap[s]];
        i = s;
      }
    }
    return top;
  };

  gScore[startIdx] = 0;
  fOf[startIdx] = h(start.cx, start.cz);
  push(startIdx);

  const dirs = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
  ];

  while (heap.length) {
    const current = pop();
    if (current === goalIdx) {
      const path: Cell[] = [];
      let c = current;
      while (c !== -1) {
        path.push({ cx: c % n, cz: Math.floor(c / n) });
        c = cameFrom[c];
      }
      return path.reverse();
    }
    if (closed[current]) continue;
    closed[current] = 1;

    const ccx = current % n;
    const ccz = Math.floor(current / n);
    for (const [dx, dz, cost] of dirs) {
      const nx = ccx + dx;
      const nz = ccz + dz;
      if (!passable(nx, nz)) continue;
      // Prevent diagonal corner-cutting through walls.
      if (dx !== 0 && dz !== 0 && (!passable(ccx + dx, ccz) || !passable(ccx, ccz + dz))) continue;
      const nIdx = grid.index(nx, nz);
      if (closed[nIdx]) continue;
      const tentative = gScore[current] + cost;
      if (tentative < gScore[nIdx]) {
        cameFrom[nIdx] = current;
        gScore[nIdx] = tentative;
        fOf[nIdx] = tentative + h(nx, nz);
        push(nIdx);
      }
    }
  }
  return null;
}
