import { describe, it, expect } from "vitest";
import { OccupancyGrid } from "./grid";

describe("OccupancyGrid", () => {
  it("round-trips world <-> cell coordinates", () => {
    const g = new OccupancyGrid(10, 1); // n = 20
    const { cx, cz } = g.worldToCell(0, 0);
    const center = g.cellCenter(cx, cz);
    expect(Math.abs(center.x)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(center.z)).toBeLessThanOrEqual(0.5);
  });

  it("treats out-of-bounds as occupied", () => {
    const g = new OccupancyGrid(5, 1);
    expect(g.get(-1, 0)).toBe(2);
    expect(g.get(999, 0)).toBe(2);
  });

  it("sets free/occupied and reports coverage", () => {
    const g = new OccupancyGrid(2, 1); // n = 4 -> 16 cells
    expect(g.coverage()).toBe(0);
    g.setFree(0, 0);
    g.setOccupied(1, 1);
    expect(g.get(0, 0)).toBe(1);
    expect(g.get(1, 1)).toBe(2);
    expect(g.coverage()).toBeCloseTo(2 / 16);
  });

  it("does not downgrade an occupied cell back to free", () => {
    const g = new OccupancyGrid(2, 1);
    g.setOccupied(0, 0);
    g.setFree(0, 0);
    expect(g.get(0, 0)).toBe(2);
  });

  it("detects frontiers between free and unknown space", () => {
    const g = new OccupancyGrid(3, 1); // n = 6
    // A single free cell surrounded by unknown is a frontier.
    g.setFree(3, 3);
    const fr = g.frontiers();
    expect(fr).toContain(g.index(3, 3));

    // A free cell whose neighbours are all free/occupied is not a frontier.
    const g2 = new OccupancyGrid(3, 1);
    g2.setFree(2, 2);
    g2.setFree(3, 2);
    g2.setFree(1, 2);
    g2.setFree(2, 1);
    g2.setFree(2, 3);
    expect(g2.frontiers()).not.toContain(g2.index(2, 2));
  });

  it("traces a ray marking free cells and an occupied hit", () => {
    const g = new OccupancyGrid(5, 1);
    g.trace(0, 0, 1, 0, 3, true); // ray along +x, length 3, with a hit
    const origin = g.worldToCell(0, 0);
    const hit = g.worldToCell(3, 0);
    expect(g.get(origin.cx + 1, origin.cz)).toBe(1); // a free cell along the ray
    expect(g.get(hit.cx, hit.cz)).toBe(2); // occupied at the hit
  });
});
