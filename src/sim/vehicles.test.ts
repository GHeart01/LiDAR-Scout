import { describe, it, expect } from "vitest";
import { VEHICLES, VEHICLE_TYPES } from "./vehicles";

describe("vehicles", () => {
  it("defines a spec for every vehicle type", () => {
    for (const t of VEHICLE_TYPES) {
      const spec = VEHICLES[t];
      expect(spec).toBeDefined();
      expect(spec.label.length).toBeGreaterThan(0);
      expect(spec.turnRate).toBeGreaterThan(0);
      expect(spec.speedScale).toBeGreaterThan(0);
    }
  });

  it("gives each vehicle distinct kinematics", () => {
    const turnRates = VEHICLE_TYPES.map((t) => VEHICLES[t].turnRate);
    expect(new Set(turnRates).size).toBe(turnRates.length);
  });
});
