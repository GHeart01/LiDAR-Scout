import * as THREE from "three";

// A 360° sweeping LiDAR. One ray is cast per integer degree as the beam rotates,
// building a persistent polar distance map (distances[deg]). The leading beam is
// drawn as a bright line and every recorded hit is shown as a point.
export class Lidar {
  constructor(scene) {
    this.maxRange = 30;
    this.sweepSpeed = THREE.MathUtils.degToRad(300); // radians / second
    this.angleDeg = 0; // current beam direction (degrees)
    this._acc = 0; // fractional-degree accumulator

    this.distances = new Float32Array(360).fill(this.maxRange);
    this.valid = new Array(360).fill(false);
    this.hitX = new Float32Array(360);
    this.hitZ = new Float32Array(360);

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = this.maxRange;

    // Persistent point cloud of hits.
    this.geom = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(new Float32Array(360 * 3), 3);
    this.geom.setAttribute("position", this.posAttr);
    this.points = new THREE.Points(
      this.geom,
      new THREE.PointsMaterial({ color: 0xfacc15, size: 5, sizeAttenuation: false })
    );
    this.points.frustumCulled = false;
    scene.add(this.points);

    // Active beam line.
    this.beamGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    this.beam = new THREE.Line(
      this.beamGeom,
      new THREE.LineBasicMaterial({ color: 0xf87171 })
    );
    this.beam.frustumCulled = false;
    scene.add(this.beam);
  }

  setSweepSpeedDeg(deg) {
    this.sweepSpeed = THREE.MathUtils.degToRad(deg);
  }

  _castDegree(deg, origin, targets) {
    const a = THREE.MathUtils.degToRad(deg);
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    this.raycaster.set(origin, dir);
    this.raycaster.far = this.maxRange;
    const hits = this.raycaster.intersectObjects(targets, false);
    if (hits.length) {
      const p = hits[0].point;
      this.distances[deg] = hits[0].distance;
      this.valid[deg] = true;
      this.hitX[deg] = p.x;
      this.hitZ[deg] = p.z;
    } else {
      this.distances[deg] = this.maxRange;
      this.valid[deg] = false;
    }
  }

  update(dt, origin, targets) {
    // Advance the beam, casting one ray per whole degree crossed.
    this._acc += THREE.MathUtils.radToDeg(this.sweepSpeed * dt);
    let steps = 0;
    while (this._acc >= 1 && steps < 360) {
      this._acc -= 1;
      this.angleDeg = (this.angleDeg + 1) % 360;
      this._castDegree(this.angleDeg, origin, targets);
      steps++;
    }

    // Rebuild the visible point cloud from valid hits.
    const arr = this.posAttr.array;
    let n = 0;
    for (let d = 0; d < 360; d++) {
      if (!this.valid[d]) continue;
      arr[n * 3] = this.hitX[d];
      arr[n * 3 + 1] = 0.25;
      arr[n * 3 + 2] = this.hitZ[d];
      n++;
    }
    this.posAttr.needsUpdate = true;
    this.geom.setDrawRange(0, n);

    // Draw the leading beam from the sensor to its current hit (or max range).
    const a = THREE.MathUtils.degToRad(this.angleDeg);
    const dist = this.valid[this.angleDeg] ? this.distances[this.angleDeg] : this.maxRange;
    const end = new THREE.Vector3(
      origin.x + Math.cos(a) * dist,
      0.25,
      origin.z + Math.sin(a) * dist
    );
    const bp = this.beamGeom.attributes.position.array;
    bp[0] = origin.x; bp[1] = 0.25; bp[2] = origin.z;
    bp[3] = end.x; bp[4] = end.y; bp[5] = end.z;
    this.beamGeom.attributes.position.needsUpdate = true;
  }

  // Minimum measured distance within a sector centered on a heading (degrees).
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

  // Smallest distance over the whole scan (used for the HUD / collision sense).
  nearest() {
    let min = this.maxRange;
    for (let d = 0; d < 360; d++) {
      if (this.valid[d] && this.distances[d] < min) min = this.distances[d];
    }
    return min;
  }

  // Direction (degrees) with the most clearance, with a mild bias toward
  // `preferDeg` so the robot doesn't oscillate between equally open headings.
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
      let diff = Math.abs(((d - preferDeg + 540) % 360) - 180); // 0..180
      const score = clearance - diff * 0.01;
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    return best;
  }

  reset() {
    this.distances.fill(this.maxRange);
    this.valid.fill(false);
    this.angleDeg = 0;
    this._acc = 0;
    this.geom.setDrawRange(0, 0);
  }
}
