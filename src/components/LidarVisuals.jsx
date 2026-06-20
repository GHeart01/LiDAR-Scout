import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { simulation } from "../sim/instance.js";
import { DEG } from "../sim/constants.js";

// Persistent hit-point cloud + the active sweeping beam.
export default function LidarVisuals() {
  const points = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(360 * 3), 3));
    const m = new THREE.PointsMaterial({ color: 0xfacc15, size: 5, sizeAttenuation: false });
    const p = new THREE.Points(g, m);
    p.frustumCulled = false;
    return p;
  }, []);

  const beam = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xf87171 }));
    l.frustumCulled = false;
    return l;
  }, []);

  useFrame(() => {
    const sim = simulation;

    // Point cloud from valid hits.
    const arr = points.geometry.attributes.position.array;
    let n = 0;
    for (let d = 0; d < 360; d++) {
      if (!sim.valid[d]) continue;
      arr[n * 3] = sim.hitX[d];
      arr[n * 3 + 1] = 0.25;
      arr[n * 3 + 2] = sim.hitZ[d];
      n++;
    }
    points.geometry.attributes.position.needsUpdate = true;
    points.geometry.setDrawRange(0, n);

    // Active beam from the sensor to its current reading.
    const a = sim.angleDeg * DEG;
    const dist = sim.valid[sim.angleDeg] ? sim.distances[sim.angleDeg] : sim.maxRange;
    const ox = sim.robot.position.x;
    const oz = sim.robot.position.z;
    const bp = beam.geometry.attributes.position.array;
    bp[0] = ox; bp[1] = 0.25; bp[2] = oz;
    bp[3] = ox + Math.cos(a) * dist; bp[4] = 0.25; bp[5] = oz + Math.sin(a) * dist;
    beam.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <>
      <primitive object={points} />
      <primitive object={beam} />
    </>
  );
}
