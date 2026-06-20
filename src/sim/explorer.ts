import { OccupancyGrid, Cell } from "./grid";

// Pick the nearest frontier cell (free cell bordering the unknown) that hasn't
// already been claimed by another robot — the basis of multi-robot frontier
// exploration.
export function chooseFrontier(
  grid: OccupancyGrid,
  from: Cell,
  claimed: Set<number>
): { cell: Cell; index: number } | null {
  const frontier = grid.frontiers();
  let best = -1;
  let bestDist = Infinity;
  for (const idx of frontier) {
    if (claimed.has(idx)) continue;
    const cx = idx % grid.n;
    const cz = Math.floor(idx / grid.n);
    const d = (cx - from.cx) ** 2 + (cz - from.cz) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = idx;
    }
  }
  if (best === -1) return null;
  return { cell: { cx: best % grid.n, cz: Math.floor(best / grid.n) }, index: best };
}

// True once there are no more reachable frontiers (exploration complete).
export function fullyExplored(grid: OccupancyGrid): boolean {
  return grid.frontiers().length === 0;
}

export interface RankedFrontier {
  cell: Cell;
  index: number;
}

// All unclaimed frontiers, nearest first, so a planner can try them in order
// until it finds one it can actually reach.
export function rankedFrontiers(
  grid: OccupancyGrid,
  from: Cell,
  claimed: Set<number>,
  blacklist: Set<number>
): RankedFrontier[] {
  const out: { cell: Cell; index: number; d: number }[] = [];
  for (const idx of grid.frontiers()) {
    if (claimed.has(idx) || blacklist.has(idx)) continue;
    const cx = idx % grid.n;
    const cz = Math.floor(idx / grid.n);
    out.push({ cell: { cx, cz }, index: idx, d: (cx - from.cx) ** 2 + (cz - from.cz) ** 2 });
  }
  out.sort((a, b) => a.d - b.d);
  return out.map(({ cell, index }) => ({ cell, index }));
}

// Nearest frontier the robot can actually reach, found with a BFS that only
// traverses free cells kept `inflate` cells clear of obstacles (robot radius).
// Returns null if no reachable frontier remains.
export function nearestReachableFrontier(
  grid: OccupancyGrid,
  from: Cell,
  claimed: Set<number>,
  inflate: number
): RankedFrontier | null {
  const n = grid.n;
  const occupiedNear = (cx: number, cz: number): boolean => {
    for (let dz = -inflate; dz <= inflate; dz++) {
      for (let dx = -inflate; dx <= inflate; dx++) {
        if (grid.get(cx + dx, cz + dz) === 2) return true;
      }
    }
    return false;
  };
  const passable = (cx: number, cz: number): boolean =>
    grid.get(cx, cz) === 1 && !(inflate > 0 && occupiedNear(cx, cz));
  const isFrontier = (cx: number, cz: number): boolean =>
    grid.get(cx, cz) === 1 &&
    (grid.get(cx + 1, cz) === 0 ||
      grid.get(cx - 1, cz) === 0 ||
      grid.get(cx, cz + 1) === 0 ||
      grid.get(cx, cz - 1) === 0);

  const visited = new Uint8Array(n * n);
  const queue: number[] = [];
  const start = grid.index(from.cx, from.cz);
  queue.push(start);
  visited[start] = 1;
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  for (let head = 0; head < queue.length; head++) {
    const idx = queue[head];
    const cx = idx % n;
    const cz = Math.floor(idx / n);
    if (idx !== start && !claimed.has(idx) && isFrontier(cx, cz)) {
      return { cell: { cx, cz }, index: idx };
    }
    for (const [dx, dz] of dirs) {
      const nx = cx + dx;
      const nz = cz + dz;
      if (nx < 0 || nz < 0 || nx >= n || nz >= n) continue;
      const nIdx = nz * n + nx;
      if (visited[nIdx]) continue;
      if (passable(nx, nz)) {
        visited[nIdx] = 1;
        queue.push(nIdx);
      }
    }
  }
  return null;
}
