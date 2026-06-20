import * as THREE from "three";
import { ARENA, DEG } from "./constants";
import { OccupancyGrid } from "./grid";
import { Robot } from "./robot";
import { Prey } from "./prey";
import { mulberry32, Rng } from "./rng";
import { SensorParams, DEFAULT_SENSOR } from "./sensor";
import { VehicleType, VEHICLES } from "./vehicles";

export interface StepParams {
  driveSpeed: number;
  sweepRate: number; // degrees / second
  safeDist: number;
  sensor: SensorParams;
}

// Pac-Man ghost colours + names: Blinky, Pinky, Inky, Clyde.
export const ROBOT_COLORS = ["#ff0000", "#ffb8ff", "#00ffff", "#ffb852"];
export const ROBOT_NAMES = ["Red", "Pink", "Cyan", "Orange"];

const CATCH = 1.7; // distance at which a robot catches the prey

// The simulated world: a shared occupancy map, N chasing robots, and the prey.
export class World {
  grid: OccupancyGrid;
  robots: Robot[] = [];
  prey: Prey;
  targets: THREE.Object3D[] = [];
  raycaster = new THREE.Raycaster();
  rng: Rng = mulberry32(1337);
  time = 0;
  running = false;
  epoch = 0;
  vehicle: VehicleType = "drone";
  speedScale = 1;
  catches = 0;

  constructor() {
    this.grid = new OccupancyGrid(ARENA, 0.6);
    this.prey = new Prey();
    this.setRobotCount(4);
    this.setVehicle("drone");
    this.respawnPrey();
  }

  setVehicle(type: VehicleType): void {
    this.vehicle = type;
    const spec = VEHICLES[type];
    this.speedScale = spec.speedScale;
    for (const r of this.robots) r.turnRate = spec.turnRate * DEG;
  }

  private startPose(i: number, total: number): { x: number; z: number; h: number } {
    if (total === 1) return { x: 0, z: 0, h: 0 };
    const r = 5;
    const a = (i / total) * Math.PI * 2;
    return { x: Math.cos(a) * r, z: Math.sin(a) * r, h: a };
  }

  setRobotCount(n: number): void {
    n = Math.max(1, Math.min(ROBOT_COLORS.length, n));
    while (this.robots.length < n) {
      const i = this.robots.length;
      this.robots.push(new Robot(i, ROBOT_COLORS[i], ROBOT_NAMES[i]));
    }
    if (this.robots.length > n) this.robots.length = n;
    this.placeRobots();
    this.setVehicle(this.vehicle);
  }

  private placeRobots(): void {
    const n = this.robots.length;
    this.robots.forEach((r, i) => {
      const p = this.startPose(i, n);
      r.resetTo(p.x, p.z, p.h);
    });
  }

  respawnPrey(): void {
    const lim = this.grid.arena - 2;
    for (let i = 0; i < 40; i++) {
      const x = (this.rng() * 2 - 1) * lim;
      const z = (this.rng() * 2 - 1) * lim;
      let ok = true;
      for (const r of this.robots) {
        if (Math.hypot(x - r.position.x, z - r.position.z) < 10) {
          ok = false;
          break;
        }
      }
      if (ok) {
        this.prey.reset(x, z, this.rng);
        return;
      }
    }
    this.prey.reset(0, 0, this.rng);
  }

  reset(): void {
    this.grid.clear();
    this.time = 0;
    this.epoch++;
    this.rng = mulberry32(1337);
    this.running = false;
    this.catches = 0;
    this.placeRobots();
    this.respawnPrey();
  }

  start(): void {
    this.running = true;
    for (const r of this.robots) r.beginChase();
  }

  stop(): void {
    this.running = false;
    for (const r of this.robots) r.state = "IDLE";
  }

  step(dt: number, params: StepParams): void {
    this.time += dt;
    this.prey.update(dt, this);
    for (const r of this.robots) {
      if (this.running && r.state === "IDLE") r.beginChase();
      r.update(dt, this, params);
    }
    // Catch detection.
    for (const r of this.robots) {
      const dx = r.position.x - this.prey.position.x;
      const dz = r.position.z - this.prey.position.z;
      if (dx * dx + dz * dz < CATCH * CATCH) {
        this.catches++;
        this.respawnPrey();
        break;
      }
    }
  }

  coverage(): number {
    return this.grid.coverage();
  }
}

export { DEFAULT_SENSOR };
