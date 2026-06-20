import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { simulation } from "../sim/instance.js";
import { ARENA } from "../sim/constants.js";
import { useStore } from "../store.js";

// The map the robot builds as it scans:
//  - a persistent glowing point cloud of occupied cells, and
//  - a fog-of-war veil over the floor that lifts where the robot has seen.
export default function DiscoveredMap() {
  const showMap = useStore((s) => s.showMap);
  const N = simulation.gridN;

  const occ = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * N * 3), 3));
    g.setDrawRange(0, 0);
    const m = new THREE.PointsMaterial({ color: 0x22d3ee, size: 4.5, sizeAttenuation: false, toneMapped: false });
    const p = new THREE.Points(g, m);
    p.frustumCulled = false;
    return p;
  }, [N]);
  const occCount = useRef(0);

  const fog = useMemo(() => {
    const data = new Uint8Array(N * N * 4);
    for (let i = 0; i < N * N; i++) {
      data[i * 4] = 7;
      data[i * 4 + 1] = 12;
      data[i * 4 + 2] = 24;
      data[i * 4 + 3] = 170; // veil over unknown cells
    }
    const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
    tex.needsUpdate = true;
    return { tex, data };
  }, [N]);

  const epoch = useRef(simulation.mapEpoch);

  useFrame(() => {
    const sim = simulation;

    // Reset detection (clears cloud + restores veil).
    if (sim.mapEpoch !== epoch.current) {
      epoch.current = sim.mapEpoch;
      occCount.current = 0;
      occ.geometry.setDrawRange(0, 0);
      for (let i = 0; i < N * N; i++) fog.data[i * 4 + 3] = 170;
      fog.tex.needsUpdate = true;
    }

    // Append newly discovered occupied cells to the cloud.
    if (sim.newOccupied.length) {
      const arr = occ.geometry.attributes.position.array;
      const q = sim.newOccupied;
      for (let k = 0; k < q.length; k += 2) {
        const c = occCount.current;
        if (c >= N * N) break;
        arr[c * 3] = q[k];
        arr[c * 3 + 1] = 0.3;
        arr[c * 3 + 2] = q[k + 1];
        occCount.current++;
      }
      q.length = 0;
      occ.geometry.attributes.position.needsUpdate = true;
      occ.geometry.setDrawRange(0, occCount.current);
    }

    // Lift the veil over revealed cells.
    if (sim.fogDirty) {
      sim.fogDirty = false;
      const rev = sim.revealed;
      const data = fog.data;
      for (let cz = 0; cz < N; cz++) {
        for (let cx = 0; cx < N; cx++) {
          if (rev[cz * N + cx]) {
            const ti = ((N - 1 - cz) * N + cx) * 4;
            data[ti + 3] = 0;
          }
        }
      }
      fog.tex.needsUpdate = true;
    }
  });

  return (
    <group visible={showMap}>
      <primitive object={occ} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <planeGeometry args={[ARENA * 2, ARENA * 2]} />
        <meshBasicMaterial map={fog.tex} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}
