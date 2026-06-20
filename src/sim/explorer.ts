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
