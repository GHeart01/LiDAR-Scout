import { describe, it, expect } from "vitest";
import { OccupancyGrid } from "./grid";
import { chooseFrontier, fullyExplored, rankedFrontiers } from "./explorer";

describe("chooseFrontier", () => {
  it("picks the nearest unclaimed frontier", () => {
    const g = new OccupancyGrid(6, 1); // n = 12
    // Two isolated free cells, both frontiers (bordered by unknown).
    g.setFree(2, 2);
    g.setFree(9, 9);
    const from = { cx: 1, cz: 1 };
    const picked = chooseFrontier(g, from, new Set());
    expect(picked).not.toBeNull();
    expect(picked!.cell).toEqual({ cx: 2, cz: 2 });
  });

  it("skips claimed frontiers", () => {
    const g = new OccupancyGrid(6, 1);
    g.setFree(2, 2);
    g.setFree(9, 9);
    const claimed = new Set([g.index(2, 2)]);
    const picked = chooseFrontier(g, { cx: 1, cz: 1 }, claimed);
    expect(picked!.cell).toEqual({ cx: 9, cz: 9 });
  });

  it("ranks frontiers nearest-first and skips claimed/blacklisted", () => {
    const g = new OccupancyGrid(6, 1);
    g.setFree(2, 2);
    g.setFree(9, 9);
    const r = rankedFrontiers(g, { cx: 1, cz: 1 }, new Set(), new Set());
    expect(r[0].cell).toEqual({ cx: 2, cz: 2 });
    const r2 = rankedFrontiers(g, { cx: 1, cz: 1 }, new Set([g.index(2, 2)]), new Set());
    expect(r2[0].cell).toEqual({ cx: 9, cz: 9 });
  });

  it("reports fully explored when no frontiers remain", () => {
    const g = new OccupancyGrid(2, 1); // n = 4
    for (let cz = 0; cz < g.n; cz++) for (let cx = 0; cx < g.n; cx++) g.setFree(cx, cz);
    expect(fullyExplored(g)).toBe(true);
    expect(chooseFrontier(g, { cx: 0, cz: 0 }, new Set())).toBeNull();
  });
});
