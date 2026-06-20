import { Rng } from "./rng";

// Realistic LiDAR sensor parameters.
export interface SensorParams {
  range: number; // max range (world units)
  fovDeg: number; // field of view (360 = full rotation)
  beams: number; // angular resolution (rays per full scan)
  noiseStd: number; // Gaussian range noise std-dev (world units)
  dropout: number; // probability a return is lost (0..1)
}

export const DEFAULT_SENSOR: SensorParams = {
  range: 30,
  fovDeg: 360,
  beams: 360,
  noiseStd: 0.05,
  dropout: 0.02,
};

// Standard normal sample via Box–Muller (deterministic given the RNG).
export function gaussian(rng: Rng, std: number): number {
  if (std <= 0) return 0;
  const u = 1 - rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * std;
}

// Apply range noise to a raw measured distance, clamped to [0, range].
export function noisyRange(raw: number, params: SensorParams, rng: Rng): number {
  const d = raw + gaussian(rng, params.noiseStd);
  return Math.max(0, Math.min(params.range, d));
}

// Whether this return is dropped (sensor miss).
export function dropped(params: SensorParams, rng: Rng): boolean {
  return rng() < params.dropout;
}

// Whether a world angle (deg) lies within the sensor's FOV around a heading.
export function inFov(angleDeg: number, headingDeg: number, fovDeg: number): boolean {
  if (fovDeg >= 360) return true;
  let diff = ((angleDeg - headingDeg + 540) % 360) - 180;
  return Math.abs(diff) <= fovDeg / 2;
}
