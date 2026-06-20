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
  }

  // ---- LiDAR -------------------------------------------------------------
  _castDegree(deg, targets) {
    const a = deg * DEG;
    this._dir.set(Math.cos(a), 0, Math.sin(a));
    this.raycaster.set(this._origin, this._dir);
    this.raycaster.far = this.maxRange;
    const hits = this.raycaster.intersectObjects(targets, false);
    if (hits.length) {
      this.distances[deg] = hits[0].distance;
      this.valid[deg] = true;
      this.hitX[deg] = hits[0].point.x;
      this.hitZ[deg] = hits[0].point.z;
    } else {
      this.distances[deg] = this.maxRange;
      this.valid[deg] = false;
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
