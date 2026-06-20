import * as THREE from "three";
import { DEG } from "./constants";
import { Cell } from "./grid";
import { aStar } from "./planner";
import { nearestReachableFrontier } from "./explorer";
import { inFov, noisyRange, dropped } from "./sensor";
import type { World, StepParams } from "./world";

export type FsmState = "IDLE" | "PLAN" | "NAV" | "AVOID" | "DONE";

const REPLAN_INTERVAL = 3.0; // re-plan against the updated map this often
const SENSOR_Y = 0.5;
const INFLATE = 2; // grid cells of obstacle clearance (~robot radius)
const MAP_START = 0.03; // coverage below which we're still doing the first scan

function angNorm(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

// One autonomous robot: owns its pose, FSM, and LiDAR buffers; writes into the
// world's shared occupancy grid as it senses.
export class Robot {
  readonly id: number;
  readonly color: string;

  position = new THREE.Vector3();
  heading = 0;
  speed = 6;
  turnRate = THREE.MathUtils.degToRad(150);

  maxRange = 30;
  angleDeg = 0;
  private acc = 0;
  distances = new Float32Array(360);
  valid = new Uint8Array(360);
  hitX = new Float32Array(360);
  hitZ = new Float32Array(360);
  hitTime = new Float32Array(360);

  state: FsmState = "IDLE";
  timer = 0;
  path: Cell[] | null = null;
  pathIndex = 0;
  targetFrontier = -1;

  private origin = new THREE.Vector3();
  private dir = new THREE.Vector3();

  constructor(id: number, color: string) {
    this.id = id;
    this.color = color;
    this.distances.fill(this.maxRange);
  }

  headingDeg(): number {
    return (((this.heading / DEG) % 360) + 360) % 360;
  }

  resetTo(x: number, z: number, heading: number): void {
    this.position.set(x, 0, z);
    this.heading = heading;
    this.state = "IDLE";
    this.timer = 0;
    this.path = null;
    this.pathIndex = 0;
    this.targetFrontier = -1;
    this.valid.fill(0);
    this.distances.fill(this.maxRange);
  }

  private enter(s: FsmState): void {
    this.state = s;
    this.timer = 0;
  }

  // ---- Sensing -----------------------------------------------------------
  private castDegree(deg: number, world: World, params: StepParams): void {
    const sp = params.sensor;
    const hd = this.headingDeg();
    if (!inFov(deg, hd, sp.fovDeg)) {
      this.valid[deg] = 0;
      return;
    }
    const a = deg * DEG;
    const ax = Math.cos(a);
    const az = Math.sin(a);
    this.origin.set(this.position.x, SENSOR_Y, this.position.z);
    this.dir.set(ax, 0, az);
    world.raycaster.set(this.origin, this.dir);
    world.raycaster.far = sp.range;
    const hits = world.raycaster.intersectObjects(world.targets, false);
    this.hitTime[deg] = world.time;

    if (hits.length && !dropped(sp, world.rng)) {
      const d = noisyRange(hits[0].distance, sp, world.rng);
      this.distances[deg] = d;
      this.valid[deg] = 1;
      this.hitX[deg] = this.position.x + ax * d;
      this.hitZ[deg] = this.position.z + az * d;
      world.grid.trace(this.position.x, this.position.z, ax, az, d, true);
    } else {
      this.distances[deg] = sp.range;
      this.valid[deg] = 0;
      world.grid.trace(this.position.x, this.position.z, ax, az, sp.range, false);
    }
  }

  private sense(dt: number, world: World, params: StepParams): void {
    // The robot's own cell is always free/observed.
    const oc = world.grid.worldToCell(this.position.x, this.position.z);
    world.grid.setFree(oc.cx, oc.cz);

    this.maxRange = params.sensor.range;
    const k = Math.max(1, Math.round(360 / params.sensor.beams));
    this.acc += params.sweepRate * dt;
    let steps = 0;
    while (this.acc >= 1 && steps < 360) {
      this.acc -= 1;
      this.angleDeg = (this.angleDeg + 1) % 360;
      if (this.angleDeg % k === 0) this.castDegree(this.angleDeg, world, params);
      steps++;
    }
  }

  // ---- Queries -----------------------------------------------------------
  frontDistance(headingDeg: number, half = 20): number {
    const h = Math.round(headingDeg);
    let min = this.maxRange;
    for (let o = -half; o <= half; o++) {
      const d = (((h + o) % 360) + 360) % 360;
      const dist = this.valid[d] ? this.distances[d] : this.maxRange;
      if (dist < min) min = dist;
    }
    return min;
  }

  nearest(): number {
    let min = this.maxRange;
    for (let d = 0; d < 360; d++) if (this.valid[d] && this.distances[d] < min) min = this.distances[d];
    return min;
  }

  bestDirectionDeg(preferDeg: number, window = 18): number {
    let best = 0;
    let bestScore = -Infinity;
    for (let d = 0; d < 360; d++) {
      let clearance = this.maxRange;
      for (let o = -window; o <= window; o++) {
        const k = (((d + o) % 360) + 360) % 360;
        const dist = this.valid[k] ? this.distances[k] : this.maxRange;
        if (dist < clearance) clearance = dist;
      }
      const diff = Math.abs((((d - preferDeg + 540) % 360) - 180));
      const score = clearance - diff * 0.01;
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    return best;
  }

  // Distance to the nearest other robot that is roughly ahead (collision sense).
  private robotAhead(world: World): number {
    let m = Infinity;
    for (const o of world.robots) {
      if (o === this) continue;
      const dx = o.position.x - this.position.x;
      const dz = o.position.z - this.position.z;
      const d = Math.hypot(dx, dz);
      if (d > 4) continue;
      const diff = Math.abs(angNorm(Math.atan2(dz, dx) - this.heading));
      if (diff < Math.PI / 3) m = Math.min(m, d);
    }
    return m;
  }

  // ---- Motion ------------------------------------------------------------
  private turnToward(target: number, dt: number): void {
    const diff = angNorm(target - this.heading);
    const step = this.turnRate * dt;
    this.heading += Math.abs(diff) <= step ? diff : Math.sign(diff) * step;
  }

  private clamp(world: World): void {
    const lim = world.grid.arena - 1.6;
    this.position.x = THREE.MathUtils.clamp(this.position.x, -lim, lim);
    this.position.z = THREE.MathUtils.clamp(this.position.z, -lim, lim);
  }

  // ---- Planning / behaviour ---------------------------------------------
  // Spin slowly in place so a (possibly narrow-FOV) sensor sweeps the area.
  private idleScan(dt: number): void {
    this.heading += this.turnRate * dt * 0.4;
  }

  private plan(dt: number, world: World, claimed: Set<number>): void {
    const cell = world.grid.worldToCell(this.position.x, this.position.z);
    const target = nearestReachableFrontier(world.grid, cell, claimed, INFLATE);

    if (!target) {
      // Nothing reachable: either still mapping (keep scanning) or finished.
      if (world.grid.coverage() < MAP_START) this.idleScan(dt);
      else this.enter("DONE");
      return;
    }

    const path = aStar(world.grid, cell, target.cell, { inflate: INFLATE });
    if (!path) {
      if (world.grid.coverage() < MAP_START) this.idleScan(dt);
      return; // stay in PLAN, try again next frame
    }
    this.targetFrontier = target.index;
    this.path = path;
    this.pathIndex = Math.min(1, path.length - 1);
    this.enter("NAV");
  }

  private follow(dt: number, world: World): void {
    if (!this.path) {
      this.enter("PLAN");
      return;
    }
    const wp = this.path[this.pathIndex];
    if (world.grid.get(wp.cx, wp.cz) === 2) {
      this.enter("PLAN"); // path is now blocked
      return;
    }
    const c = world.grid.cellCenter(wp.cx, wp.cz);
    const dx = c.x - this.position.x;
    const dz = c.z - this.position.z;
    if (Math.hypot(dx, dz) < world.grid.cell * 0.7) {
      this.pathIndex++;
      if (this.pathIndex >= this.path.length) this.enter("PLAN");
      return;
    }
    const desired = Math.atan2(dz, dx);
    this.turnToward(desired, dt);
    if (Math.abs(angNorm(desired - this.heading)) < 0.6) {
      this.position.x += Math.cos(this.heading) * this.speed * dt;
      this.position.z += Math.sin(this.heading) * this.speed * dt;
    }
  }

  update(dt: number, world: World, params: StepParams, claimed: Set<number>): void {
    this.speed = params.driveSpeed * world.speedScale;
    this.sense(dt, world, params);
    this.timer += dt;

    const hd = this.headingDeg();
    const front = Math.min(this.frontDistance(hd, 20), this.robotAhead(world));

    switch (this.state) {
      case "IDLE":
        break;
      case "PLAN":
        this.plan(dt, world, claimed);
        break;
      case "NAV":
        if (front < params.safeDist) this.enter("AVOID");
        else if (this.timer > REPLAN_INTERVAL) this.enter("PLAN");
        else this.follow(dt, world);
        break;
      case "AVOID":
        this.turnToward(this.bestDirectionDeg(hd) * DEG, dt);
        if (this.timer > 0.6 && front > params.safeDist) this.enter("PLAN");
        break;
      case "DONE":
        // Re-evaluate periodically: another robot may have opened up new area.
        if (this.timer > 3) this.enter("PLAN");
        break;
    }
    this.clamp(world);
  }
}
