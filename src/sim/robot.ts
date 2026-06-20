import * as THREE from "three";
import { DEG, ARENA } from "./constants";
import { Cell } from "./grid";
import { aStar } from "./planner";
import { inFov, noisyRange, dropped } from "./sensor";
import type { World, StepParams } from "./world";

// Pursuit FSM — the robots never "finish"; they chase the prey forever.
export type FsmState = "IDLE" | "CHASE" | "AVOID";

const SENSOR_Y = 0.5;
const INFLATE = 2; // grid cells of obstacle clearance (~robot radius)

function angNorm(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

// One chasing robot: pose, LiDAR buffers, and a plan-and-pursue controller.
export class Robot {
  readonly id: number;
  readonly color: string;
  readonly name: string;

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

  chaseTarget = { x: 0, z: 0 };
  private startX = 0;
  private startZ = 0;
  private startHeading = 0;
  private replanAcc = 0;
  private chaseReplan: number; // how often this robot re-plans (s)
  private scatterX: number;
  private scatterZ: number;

  private origin = new THREE.Vector3();
  private dir = new THREE.Vector3();

  constructor(id: number, color: string, name: string) {
    this.id = id;
    this.color = color;
    this.name = name;
    this.distances.fill(this.maxRange);
    // The red bot is the smartest: it re-plans fastest (and predicts — below).
    this.chaseReplan = id === 0 ? 0.35 : id === 3 ? 1.0 : 0.8;
    const c = ARENA - 3;
    const corners: [number, number][] = [[-c, -c], [c, -c], [-c, c], [c, c]];
    [this.scatterX, this.scatterZ] = corners[id % 4];
  }

  headingDeg(): number {
    return (((this.heading / DEG) % 360) + 360) % 360;
  }

  resetTo(x: number, z: number, heading: number): void {
    this.startX = x;
    this.startZ = z;
    this.startHeading = heading;
    this.position.set(x, 0, z);
    this.heading = heading;
    this.state = "IDLE";
    this.timer = 0;
    this.path = null;
    this.pathIndex = 0;
    this.replanAcc = 0;
    this.chaseTarget = { x, z };
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
  frontDistance(headingDeg: number, half = 18): number {
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

  private steerMove(dt: number, desired: number): void {
    this.turnToward(desired, dt);
    // Keep moving while turning: full speed when aligned, easing to ~45% on a
    // hard turn (never stops dead to rotate).
    const diff = Math.abs(angNorm(desired - this.heading));
    const factor = 0.45 + 0.55 * Math.max(0, Math.cos(diff));
    this.position.x += Math.cos(this.heading) * this.speed * factor * dt;
    this.position.z += Math.sin(this.heading) * this.speed * factor * dt;
  }

  private clamp(world: World): void {
    const lim = world.grid.arena - 1.6;
    this.position.x = THREE.MathUtils.clamp(this.position.x, -lim, lim);
    this.position.z = THREE.MathUtils.clamp(this.position.z, -lim, lim);
  }

  // ---- Pursuit -----------------------------------------------------------
  // Each colour targets the prey differently (Pac-Man-style personalities).
  private chaseGoal(world: World): { x: number; z: number } {
    const p = world.prey;
    let tx = p.position.x;
    let tz = p.position.z;
    if (this.id === 0) {
      // Red: smartest — predicts where the prey is heading.
      tx += p.velocity.x * 0.9;
      tz += p.velocity.z * 0.9;
    } else if (this.id === 1) {
      // Pink: ambushes ahead of the prey.
      tx += Math.cos(p.heading) * 4;
      tz += Math.sin(p.heading) * 4;
    } else if (this.id === 3) {
      // Orange: scatters to its corner when close, else chases directly.
      const d = Math.hypot(p.position.x - this.position.x, p.position.z - this.position.z);
      if (d < 7) {
        tx = this.scatterX;
        tz = this.scatterZ;
      }
    }
    const lim = world.grid.arena - 1.4;
    return {
      x: THREE.MathUtils.clamp(tx, -lim, lim),
      z: THREE.MathUtils.clamp(tz, -lim, lim),
    };
  }

  private planToTarget(world: World): void {
    const target = this.chaseGoal(world);
    this.chaseTarget = target;
    const start = world.grid.worldToCell(this.position.x, this.position.z);
    const goal = world.grid.worldToCell(target.x, target.z);
    let path = aStar(world.grid, start, goal, { inflate: INFLATE, allowUnknown: true });
    if (!path) path = aStar(world.grid, start, goal, { allowUnknown: true });
    this.path = path;
    this.pathIndex = path ? Math.min(1, path.length - 1) : 0;
  }

  private drive(dt: number, world: World): void {
    if (this.path && this.pathIndex < this.path.length) {
      const wp = this.path[this.pathIndex];
      if (world.grid.get(wp.cx, wp.cz) === 2) {
        this.path = null;
      } else {
        const c = world.grid.cellCenter(wp.cx, wp.cz);
        const dx = c.x - this.position.x;
        const dz = c.z - this.position.z;
        if (Math.hypot(dx, dz) < world.grid.cell * 0.7) {
          this.pathIndex++;
          if (this.pathIndex >= this.path.length) this.path = null;
        } else {
          this.steerMove(dt, Math.atan2(dz, dx));
          return;
        }
      }
    }
    // Greedy fallback straight toward the target.
    const dx = this.chaseTarget.x - this.position.x;
    const dz = this.chaseTarget.z - this.position.z;
    if (Math.hypot(dx, dz) > 0.1) this.steerMove(dt, Math.atan2(dz, dx));
  }

  beginChase(): void {
    this.path = null;
    this.replanAcc = Infinity; // force an immediate plan
    this.enter("CHASE");
  }

  update(dt: number, world: World, params: StepParams): void {
    this.speed = params.driveSpeed * world.speedScale;
    this.sense(dt, world, params);
    this.timer += dt;

    const hd = this.headingDeg();
    const front = Math.min(this.frontDistance(hd, 18), this.robotAhead(world));

    switch (this.state) {
      case "IDLE":
        break;
      case "CHASE":
        if (front < params.safeDist) {
          this.enter("AVOID");
          break;
        }
        this.replanAcc += dt;
        if (!this.path || this.replanAcc > this.chaseReplan) {
          this.replanAcc = 0;
          this.planToTarget(world);
        }
        this.drive(dt, world);
        break;
      case "AVOID":
        // Stuck avoiding for too long: teleport back to the start pose.
        if (this.timer >= 7) {
          this.position.set(this.startX, 0, this.startZ);
          this.heading = this.startHeading;
          this.path = null;
          this.enter("CHASE");
          break;
        }
        this.turnToward(this.bestDirectionDeg(hd) * DEG, dt);
        if (this.timer > 0.4 && front > params.safeDist) {
          this.path = null;
          this.enter("CHASE");
        }
        break;
    }
    this.clamp(world);
  }
}
