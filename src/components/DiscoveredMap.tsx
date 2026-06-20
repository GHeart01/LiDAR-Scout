import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { world } from "../sim/instance";
import { ARENA } from "../sim/constants";
import { useStore } from "../store";

// The shared map all robots build: a glowing cloud of occupied cells plus a
// fog-of-war veil that lifts over explored floor.
export default function DiscoveredMap() {
  const showMap = useStore((s) => s.showMap);
  const grid = world.grid;
  const N = grid.n;

  const occ = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * N * 3), 3));
    g.setDrawRange(0, 0);
    const m = new THREE.PointsMaterial({ color: 0x22d3ee, size: 4.5, sizeAttenuation: false, toneMapped: false });
    const p = new THREE.Points(g, m);
    p.frustumCulled = false;
    return p;
  }, [N]);

  const fog = useMemo(() => {
    const data = new Uint8Array(N * N * 4);
    for (let i = 0; i < N * N; i++) {
      data[i * 4] = 7;
      data[i * 4 + 1] = 12;
      data[i * 4 + 2] = 24;
      data[i * 4 + 3] = 165;
    }
    const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
    tex.needsUpdate = true;
    return { tex, data };
  }, [N]);

  const epoch = useRef(world.epoch);

  useFrame(() => {
    if (world.epoch !== epoch.current) {
      epoch.current = world.epoch;
      grid.dirty = true; // force a rebuild below
    }
    if (!grid.dirty) return;
    grid.dirty = false;

    const arr = occ.geometry.attributes.position.array as Float32Array;
    let n = 0;
    for (let cz = 0; cz < N; cz++) {
      for (let cx = 0; cx < N; cx++) {
        const state = grid.data[cz * N + cx];
        const ti = ((N - 1 - cz) * N + cx) * 4;
        fog.data[ti + 3] = state === 0 ? 165 : 0;
        if (state === 2) {
          const c = grid.cellCenter(cx, cz);
          arr[n * 3] = c.x;
          arr[n * 3 + 1] = 0.3;
          arr[n * 3 + 2] = c.z;
          n++;
        }
      }
    }
    occ.geometry.attributes.position.needsUpdate = true;
    occ.geometry.setDrawRange(0, n);
    fog.tex.needsUpdate = true;
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
