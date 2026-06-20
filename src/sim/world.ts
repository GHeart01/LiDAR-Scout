import * as THREE from "three";
import { ARENA } from "./constants";
import { OccupancyGrid } from "./grid";
import { Robot } from "./robot";
import { mulberry32, Rng } from "./rng";
import { SensorParams, DEFAULT_SENSOR } from "./sensor";

export interface StepParams {
  driveSpeed: number;
  sweepRate: number; // degrees / second
  safeDist: number;
  sensor: SensorParams;
}

export const ROBOT_COLORS = ["#2dd4bf", "#f59e0b", "#a78bfa", "#f472b6"];

// The simulated world: a shared occupancy map and N collaborating robots.
export class World {
  grid: OccupancyGrid;
  robots: Robot[] = [];
  targets: THREE.Object3D[] = [];
  raycaster = new THREE.Raycaster();
  rng: Rng = mulberry32(1337);
  time = 0;
  running = false;
  epoch = 0; // bumped on reset so renderers can clear cached buffers

  constructor() {
    this.grid = new OccupancyGrid(ARENA, 0.6);
    this.setRobotCount(2);
  }

  // Even spread of start poses near the centre.
  private startPose(i: number, total: number): { x: number; z: number; h: number } {
    if (total === 1) return { x: 0, z: 0, h: 0 };
    const r = 5;
    const a = (i / total) * Math.PI * 2;
    return { x: Math.cos(a) * r, z: Math.sin(a) * r, h: a };
  }

  setRobotCount(n: number): void {
    n = Math.max(1, Math.min(ROBOT_COLORS.length, n));
    while (this.robots.length < n) {
      this.robots.push(new Robot(this.robots.length, ROBOT_COLORS[this.robots.length]));
    }
    if (this.robots.length > n) this.robots.length = n;
    this.placeRobots();
  }

  private placeRobots(): void {
    const n = this.robots.length;
    this.robots.forEach((r, i) => {
      const p = this.startPose(i, n);
      r.resetTo(p.x, p.z, p.h);
    });
  }

  reset(): void {
    this.grid.clear();
    this.time = 0;
    this.epoch++;
    this.rng = mulberry32(1337);
    this.running = false;
    this.placeRobots();
  }

  start(): void {
    this.running = true;
    for (const r of this.robots) if (r.state === "IDLE" || r.state === "DONE") r.state = "PLAN";
  }

  stop(): void {
    this.running = false;
    for (const r of this.robots) r.state = "IDLE";
  }

  step(dt: number, params: StepParams): void {
    this.time += dt;
    // Frontiers other robots are already heading to, so we don't double-book.
    const claimed = new Set<number>();
    for (const r of this.robots) if (r.targetFrontier >= 0) claimed.add(r.targetFrontier);
    for (const r of this.robots) r.update(dt, this, params, claimed);
  }

  coverage(): number {
    return this.grid.coverage();
  }
}

export { DEFAULT_SENSOR };
