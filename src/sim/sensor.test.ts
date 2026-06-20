import { describe, it, expect } from "vitest";
import { mulberry32 } from "./rng";
import { gaussian, noisyRange, inFov, DEFAULT_SENSOR } from "./sensor";

describe("sensor model", () => {
  it("gaussian noise is ~zero-mean and deterministic for a seed", () => {
    const rng = mulberry32(42);
    let sum = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) sum += gaussian(rng, 1);
    expect(Math.abs(sum / N)).toBeLessThan(0.05);

    // Same seed -> same sequence.
    const a = mulberry32(7);
    const b = mulberry32(7);
    expect(gaussian(a, 1)).toBe(gaussian(b, 1));
  });

  it("clamps noisy range to [0, range]", () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 1000; i++) {
      const d = noisyRange(DEFAULT_SENSOR.range, DEFAULT_SENSOR, rng);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(DEFAULT_SENSOR.range);
    }
  });

  it("respects field of view", () => {
    expect(inFov(0, 0, 360)).toBe(true);
    expect(inFov(170, 0, 360)).toBe(true);
    expect(inFov(10, 0, 90)).toBe(true);
    expect(inFov(80, 0, 90)).toBe(false); // outside +/-45
    expect(inFov(350, 0, 90)).toBe(true); // wraps around (-10 deg)
  });
});
