import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { simulation } from "../sim/instance.js";
import { DEG } from "../sim/constants.js";

const FADE = 1.6; // seconds for a hit point to fade out
const WEDGE = 70; // degrees of trailing phosphor sweep

// Live scan visuals: a fading hit-point cloud, a trailing "phosphor" sweep
// wedge, and the bright active beam. Colours are unclamped (toneMapped: false)
// so the bloom pass makes them glow.
export default function LidarVisuals() {
  const points = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(360 * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(360 * 3), 3));
    const m = new THREE.PointsMaterial({ size: 6, sizeAttenuation: false, vertexColors: true, toneMapped: false });
    const p = new THREE.Points(g, m);
    p.frustumCulled = false;
    return p;
  }, []);

  const wedge = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(WEDGE * 3 * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(WEDGE * 3 * 4), 4));
    const m = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(g, m);
    mesh.frustumCulled = false;
    return mesh;
  }, []);

  const beam = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    const m = new THREE.LineBasicMaterial({ color: 0xff5a6a, toneMapped: false });
    const l = new THREE.Line(g, m);
    l.frustumCulled = false;
    return l;
  }, []);

  useFrame(() => {
    const sim = simulation;
    const now = sim.time;
    const ox = sim.robot.position.x;
    const oz = sim.robot.position.z;

    // --- Fading hit-point cloud ---
    const pp = points.geometry.attributes.position.array;
    const pc = points.geometry.attributes.color.array;
    let n = 0;
    for (let d = 0; d < 360; d++) {
      if (!sim.valid[d]) continue;
      const f = Math.max(0, 1 - (now - sim.hitTime[d]) / FADE);
      const b = 0.35 + 1.4 * f;
      pp[n * 3] = sim.hitX[d];
      pp[n * 3 + 1] = 0.25;
      pp[n * 3 + 2] = sim.hitZ[d];
      pc[n * 3] = 0.99 * b;
      pc[n * 3 + 1] = 0.82 * b;
      pc[n * 3 + 2] = 0.15 * b;
      n++;
    }
    points.geometry.attributes.position.needsUpdate = true;
    points.geometry.attributes.color.needsUpdate = true;
    points.geometry.setDrawRange(0, n);

    // --- Trailing phosphor sweep wedge ---
    const wp = wedge.geometry.attributes.position.array;
    const wc = wedge.geometry.attributes.color.array;
    const cur = sim.angleDeg;
    let vp = 0;
    let vc = 0;
    const push = (x, z, alpha) => {
      wp[vp++] = x; wp[vp++] = 0.2; wp[vp++] = z;
      wc[vc++] = 0.22; wc[vc++] = 1.05; wc[vc++] = 0.95; wc[vc++] = alpha;
    };
    for (let i = 0; i < WEDGE; i++) {
      const d0 = (((cur - i) % 360) + 360) % 360;
      const d1 = (((cur - i - 1) % 360) + 360) % 360;
      const a0 = d0 * DEG;
      const a1 = d1 * DEG;
      const r0 = sim.valid[d0] ? sim.distances[d0] : sim.maxRange;
      const r1 = sim.valid[d1] ? sim.distances[d1] : sim.maxRange;
      const al0 = 0.5 * (1 - i / WEDGE);
      const al1 = 0.5 * (1 - (i + 1) / WEDGE);
      push(ox, oz, (al0 + al1) * 0.5);
      push(ox + Math.cos(a0) * r0, oz + Math.sin(a0) * r0, al0);
      push(ox + Math.cos(a1) * r1, oz + Math.sin(a1) * r1, al1);
    }
    wedge.geometry.attributes.position.needsUpdate = true;
    wedge.geometry.attributes.color.needsUpdate = true;
    wedge.geometry.setDrawRange(0, WEDGE * 3);

    // --- Active beam ---
    const a = cur * DEG;
    const dist = sim.valid[cur] ? sim.distances[cur] : sim.maxRange;
    const bp = beam.geometry.attributes.position.array;
    bp[0] = ox; bp[1] = 0.26; bp[2] = oz;
    bp[3] = ox + Math.cos(a) * dist; bp[4] = 0.26; bp[5] = oz + Math.sin(a) * dist;
    beam.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <>
      <primitive object={wedge} />
      <primitive object={points} />
      <primitive object={beam} />
    </>
  );
}
