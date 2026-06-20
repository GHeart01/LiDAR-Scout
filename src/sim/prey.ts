import * as THREE from "three";
import type { World } from "./world";

// The roaming yellow "light" the robots chase. It wanders the arena, hugs open
// space (avoiding obstacles/walls via raycasts), and flees nearby robots.
const LOOK = 7; // how far ahead it senses obstacles
const TURN = 3.2; // rad/s steering limit

export class Prey {
  position = new THREE.Vector3();
  heading = 0;
  speed = 6;
  velocity = new THREE.Vector3();
  private origin = new THREE.Vector3();
  private dir = new THREE.Vector3();

  reset(x: number, z: number, rng: () => number): void {
    this.position.set(x, 0, z);
    this.heading = rng() * Math.PI * 2;
    this.velocity.set(0, 0, 0);
  }

  private clearance(world: World, angle: number): number {
    this.origin.set(this.position.x, 0.5, this.position.z);
    this.dir.set(Math.cos(angle), 0, Math.sin(angle));
    world.raycaster.set(this.origin, this.dir);
    world.raycaster.far = LOOK;
    const hits = world.raycaster.intersectObjects(world.targets, false);
    return hits.length ? hits[0].distance : LOOK;
  }

  update(dt: number, world: World): void {
    // Direction away from the nearest robot (so it evades).
    let ax = 0;
    let az = 0;
    let nd = Infinity;
    for (const r of world.robots) {
      const dx = this.position.x - r.position.x;
      const dz = this.position.z - r.position.z;
      const d = Math.hypot(dx, dz);
      if (d < nd) {
        nd = d;
        ax = dx;
        az = dz;
      }
    }
    const fleeAngle = Math.atan2(az, ax);
    const fleeWeight = nd < 11 ? (1 - nd / 11) * 3 : 0;

    // Score candidate directions: openness + evasion + smoothness.
    const N = 24;
    let best = this.heading;
    let bestScore = -Infinity;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const c = this.clearance(world, a);
      let score = Math.min(c, LOOK) / LOOK;
      if (c < 1.5) score -= 2; // don't drive into walls
      score += Math.cos(a - fleeAngle) * fleeWeight;
      score += Math.cos(a - this.heading) * 0.6;
      if (score > bestScore) {
        bestScore = score;
        best = a;
      }
    }

    const diff = Math.atan2(Math.sin(best - this.heading), Math.cos(best - this.heading));
    const step = TURN * dt;
    this.heading += Math.abs(diff) <= step ? diff : Math.sign(diff) * step;

    const front = this.clearance(world, this.heading);
    const v = front > 1.5 ? this.speed : this.speed * 0.2;
    const nx = this.position.x + Math.cos(this.heading) * v * dt;
    const nz = this.position.z + Math.sin(this.heading) * v * dt;
    this.velocity.set((nx - this.position.x) / Math.max(dt, 1e-3), 0, (nz - this.position.z) / Math.max(dt, 1e-3));
    this.position.x = nx;
    this.position.z = nz;

    const lim = world.grid.arena - 1.2;
    this.position.x = THREE.MathUtils.clamp(this.position.x, -lim, lim);
    this.position.z = THREE.MathUtils.clamp(this.position.z, -lim, lim);
  }
}
