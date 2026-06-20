import * as THREE from "three";
import { ARENA, DEG } from "./constants.js";

// Framework-agnostic robot + sweeping-LiDAR + FSM simulation.
// React Three Fiber components read this singleton each frame and sync their
// meshes to it; nothing here depends on React.
//
// FSM:  IDLE -> SCAN -> DRIVE -> AVOID
export class Simulation {
  constructor() {
    this.maxRange = 30;
    this.ARENA = ARENA;
    this.RESCAN_INTERVAL = 3.0;

    // Robot kinematics. Heading is a world angle; forward = (cos h, sin h) on XZ.
    this.robot = {
      position: new THREE.Vector3(0, 0, 0),
      heading: 0,
      speed: 6,
      turnRate: 140 * DEG,
    };

    // LiDAR sweep state + polar distance map.
    this.sweepSpeed = 300 * DEG;
    this.angleDeg = 0;
    this._acc = 0;
    this.distances = new Float32Array(360).fill(this.maxRange);
    this.valid = new Array(360).fill(false);
    this.hitX = new Float32Array(360);
    this.hitZ = new Float32Array(360);
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = this.maxRange;

    // Timing (drives the fading scan visuals).
    this.time = 0;
    this.hitTime = new Float32Array(360);

    // Occupancy grid for the "discovered map" (mini-SLAM).
    // occ: 0 = unknown, 1 = free (seen), 2 = occupied.
    this.cell = 0.6;
    this.gridN = Math.ceil((ARENA * 2) / this.cell);
    this.occ = new Uint8Array(this.gridN * this.gridN);
    this.revealed = new Uint8Array(this.gridN * this.gridN);
    this.newOccupied = []; // queue of [x, z] world centers for the renderer
    this.fogDirty = true;
    this.mapEpoch = 0; // bumped on reset so the renderer can clear its buffers

    // FSM
    this.fsmState = "IDLE";
    this.fsmPrev = null;
    this.fsmTimer = 0;

    this._dir = new THREE.Vector3();
    this._origin = new THREE.Vector3();
  }

  headingDeg() {
    return ((((this.robot.heading / DEG) % 360) + 360) % 360);
  }

  setState(state) {
    if (state === this.fsmState) return;
    this.fsmPrev = this.fsmState;
    this.fsmState = state;
    this.fsmTimer = 0;
  }

  reset() {
    this.robot.position.set(0, 0, 0);
    this.robot.heading = 0;
    this.distances.fill(this.maxRange);
    this.valid.fill(false);
    this.angleDeg = 0;
    this._acc = 0;
    this.fsmState = "IDLE";
    this.fsmTimer = 0;
    this.time = 0;
    this.hitTime.fill(0);
    this.occ.fill(0);
    this.revealed.fill(0);
    this.newOccupied.length = 0;
    this.fogDirty = true;
    this.mapEpoch++;
  }

  // ---- Occupancy grid ----------------------------------------------------
  _cellIndex(x, z) {
    const cx = Math.floor((x + ARENA) / this.cell);
    const cz = Math.floor((z + ARENA) / this.cell);
    if (cx < 0 || cz < 0 || cx >= this.gridN || cz >= this.gridN) return -1;
    return cz * this.gridN + cx;
  }

  _reveal(idx) {
    if (idx >= 0 && !this.revealed[idx]) {
      this.revealed[idx] = 1;
      this.fogDirty = true;
    }
  }

  _markFree(idx) {
    if (idx < 0) return;
    if (this.occ[idx] === 0) this.occ[idx] = 1;
    this._reveal(idx);
  }

  _markOccupied(x, z) {
    const cx = Math.floor((x + ARENA) / this.cell);
    const cz = Math.floor((z + ARENA) / this.cell);
    if (cx < 0 || cz < 0 || cx >= this.gridN || cz >= this.gridN) return;
    const idx = cz * this.gridN + cx;
    this._reveal(idx);
    if (this.occ[idx] !== 2) {
      this.occ[idx] = 2;
      this.newOccupied.push(-ARENA + (cx + 0.5) * this.cell, -ARENA + (cz + 0.5) * this.cell);
    }
  }

  // March along a ray marking cells free up to the hit, occupied at the hit.
  _traceRay(ox, oz, ax, az, endDist, hitValid, hx, hz) {
    const step = this.cell * 0.5;
    const n = Math.floor(endDist / step);
    let last = -1;
    for (let s = 1; s <= n; s++) {
      const dd = s * step;
      const idx = this._cellIndex(ox + ax * dd, oz + az * dd);
      if (idx === -1) break;
      if (idx !== last) {
        this._markFree(idx);
        last = idx;
      }
    }
    if (hitValid) this._markOccupied(hx, hz);
  }

  // ---- LiDAR -------------------------------------------------------------
  _castDegree(deg, targets) {
    const a = deg * DEG;
    const ax = Math.cos(a);
    const az = Math.sin(a);
    this._dir.set(ax, 0, az);
    this.raycaster.set(this._origin, this._dir);
    this.raycaster.far = this.maxRange;
    const hits = this.raycaster.intersectObjects(targets, false);
    this.hitTime[deg] = this.time;
    if (hits.length) {
      const p = hits[0].point;
      this.distances[deg] = hits[0].distance;
      this.valid[deg] = true;
      this.hitX[deg] = p.x;
      this.hitZ[deg] = p.z;
      this._traceRay(this._origin.x, this._origin.z, ax, az, hits[0].distance, true, p.x, p.z);
    } else {
      this.distances[deg] = this.maxRange;
      this.valid[deg] = false;
      this._traceRay(this._origin.x, this._origin.z, ax, az, this.maxRange, false, 0, 0);
    }
  }

  frontDistance(headingDeg, halfSector = 22) {
    const h = Math.round(headingDeg);
    let min = this.maxRange;
    for (let o = -halfSector; o <= halfSector; o++) {
      const d = (((h + o) % 360) + 360) % 360;
      const dist = this.valid[d] ? this.distances[d] : this.maxRange;
      if (dist < min) min = dist;
    }
    return min;
  }

  nearest() {
    let min = this.maxRange;
    for (let d = 0; d < 360; d++) {
      if (this.valid[d] && this.distances[d] < min) min = this.distances[d];
    }
    return min;
  }

  bestDirectionDeg(preferDeg = 0, window = 18) {
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

  // ---- Motion ------------------------------------------------------------
  _moveForward(dt) {
    const h = this.robot.heading;
    this.robot.position.x += Math.cos(h) * this.robot.speed * dt;
    this.robot.position.z += Math.sin(h) * this.robot.speed * dt;
  }

  _turnToward(targetDeg, dt) {
    const target = targetDeg * DEG;
    const diff = Math.atan2(
      Math.sin(target - this.robot.heading),
      Math.cos(target - this.robot.heading)
    );
    const step = this.robot.turnRate * dt;
    this.robot.heading += Math.abs(diff) <= step ? diff : Math.sign(diff) * step;
  }

  _clampArena() {
    const lim = this.ARENA - 1.6;
    this.robot.position.x = THREE.MathUtils.clamp(this.robot.position.x, -lim, lim);
    this.robot.position.z = THREE.MathUtils.clamp(this.robot.position.z, -lim, lim);
  }

  // ---- Per-frame step ----------------------------------------------------
  step(dt, targets, params) {
    this.time += dt;

    // Apply live parameters.
    this.robot.speed = params.driveSpeed;
    this.sweepSpeed = params.sweepRate * DEG;
    const safe = params.safeDist;

    // Sweep: cast one ray per whole degree crossed this frame.
    this._origin.set(this.robot.position.x, 0.5, this.robot.position.z);
    this._acc += (this.sweepSpeed / DEG) * dt;
    let steps = 0;
    while (this._acc >= 1 && steps < 360) {
      this._acc -= 1;
      this.angleDeg = (this.angleDeg + 1) % 360;
      this._castDegree(this.angleDeg, targets);
      steps++;
    }

    // FSM.
    this.fsmTimer += dt;
    const hd = this.headingDeg();
    const front = this.frontDistance(hd, 22);

    switch (this.fsmState) {
      case "IDLE":
        break;
      case "SCAN":
        if (this.fsmTimer > 0.9) this.setState(front > safe ? "DRIVE" : "AVOID");
        break;
      case "DRIVE":
        if (front < safe) this.setState("AVOID");
        else if (this.fsmTimer > this.RESCAN_INTERVAL) this.setState("SCAN");
        else this._moveForward(dt);
        break;
      case "AVOID": {
        const bestDeg = this.bestDirectionDeg(hd);
        this._turnToward(bestDeg, dt);
        if (front > safe * 1.15) this.setState("DRIVE");
        break;
      }
      default:
        break;
    }

    this._clampArena();
  }
}
