import { describe, it, expect } from "vitest";
import { OccupancyGrid } from "./grid";
import { aStar } from "./planner";

function allFree(g: OccupancyGrid) {
  for (let cz = 0; cz < g.n; cz++) for (let cx = 0; cx < g.n; cx++) g.setFree(cx, cz);
}

describe("aStar", () => {
  it("finds a straight path on an open grid", () => {
    const g = new OccupancyGrid(5, 1); // n = 10
    allFree(g);
    const path = aStar(g, { cx: 0, cz: 0 }, { cx: 5, cz: 0 });
    expect(path).not.toBeNull();
    expect(path![0]).toEqual({ cx: 0, cz: 0 });
    expect(path![path!.length - 1]).toEqual({ cx: 5, cz: 0 });
    expect(path!.length).toBe(6);
  });

  it("routes around a wall", () => {
    const g = new OccupancyGrid(5, 1);
    allFree(g);
    // Vertical wall at cx=3 with a single gap at cz=0.
    for (let cz = 1; cz < g.n; cz++) g.setOccupied(3, cz);
    const path = aStar(g, { cx: 0, cz: 5 }, { cx: 6, cz: 5 });
    expect(path).not.toBeNull();
    // Must pass through the gap row.
    expect(path!.some((c) => c.cx === 3 && c.cz === 0)).toBe(true);
  });

  it("returns null when the goal is walled off", () => {
    const g = new OccupancyGrid(4, 1); // n = 8
    allFree(g);
    // Fully enclose the goal cell.
    g.setOccupied(4, 3);
    g.setOccupied(4, 5);
    g.setOccupied(3, 4);
    g.setOccupied(5, 4);
    const path = aStar(g, { cx: 0, cz: 0 }, { cx: 4, cz: 4 });
    expect(path).toBeNull();
  });

  it("does not cut diagonally through wall corners", () => {
    const g = new OccupancyGrid(3, 1); // n = 6
    allFree(g);
    g.setOccupied(2, 1);
    g.setOccupied(1, 2);
    const path = aStar(g, { cx: 1, cz: 1 }, { cx: 2, cz: 2 });
    expect(path).not.toBeNull();
    // The illegal diagonal squeeze between the two walls must not be taken.
    expect(path!.some((c) => c.cx === 2 && c.cz === 2)).toBe(true);
    expect(path!.length).toBeGreaterThan(2);
  });

  it("keeps a clearance from obstacles when inflated", () => {
    const g = new OccupancyGrid(5, 1);
    allFree(g);
    g.setOccupied(5, 5);
    // Goal sits right next to the obstacle: blocked once we inflate by a cell.
    expect(aStar(g, { cx: 0, cz: 5 }, { cx: 5, cz: 4 }, { inflate: 1 })).toBeNull();
    // Without inflation it's reachable.
    expect(aStar(g, { cx: 0, cz: 5 }, { cx: 5, cz: 4 })).not.toBeNull();
  });

  it("blocks unknown cells unless allowUnknown is set", () => {
    const g = new OccupancyGrid(3, 1);
    // Only a couple of free cells; the rest unknown.
    g.setFree(0, 0);
    g.setFree(5, 5);
    expect(aStar(g, { cx: 0, cz: 0 }, { cx: 5, cz: 5 })).toBeNull();
    expect(aStar(g, { cx: 0, cz: 0 }, { cx: 5, cz: 5 }, { allowUnknown: true })).not.toBeNull();
  });
});
