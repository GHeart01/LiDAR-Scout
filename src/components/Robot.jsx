import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ARENA } from "../sim/constants.js";
import { simulation } from "../sim/instance.js";
import { useStore } from "../store.js";

const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const HIT = new THREE.Vector3();

function clamp(v) {
  const lim = ARENA - 1.6;
  return THREE.MathUtils.clamp(v, -lim, lim);
}

export default function Robot() {
  const group = useRef();
  const mast = useRef();
  const ring = useRef();
  const dragging = useRef(false);

  // Safety ring geometry (unit radius, scaled to safeDist each frame).
  const ringGeom = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  useFrame((_, delta) => {
    const r = simulation.robot;
    if (group.current) {
      group.current.position.set(r.position.x, 0, r.position.z);
      group.current.rotation.y = -r.heading;
    }
    if (mast.current) mast.current.rotation.y += delta * 6;
    if (ring.current) {
      const safe = useStore.getState().safeDist;
      ring.current.position.set(r.position.x, 0.05, r.position.z);
      ring.current.scale.set(safe, 1, safe);
    }
  });

  return (
    <>
      <group
        ref={group}
        onPointerDown={(e) => {
          e.stopPropagation();
          dragging.current = true;
          e.target.setPointerCapture(e.pointerId);
        }}
        onPointerUp={(e) => {
          dragging.current = false;
          e.target.releasePointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          e.ray.intersectPlane(GROUND, HIT);
          simulation.robot.position.x = clamp(HIT.x);
          simulation.robot.position.z = clamp(HIT.z);
        }}
      >
        {/* Chassis */}
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[1.15, 1.15, 0.7, 28]} />
          <meshStandardMaterial color="#2dd4bf" metalness={0.25} roughness={0.5} />
        </mesh>
        {/* Heading indicator (points along local +X) */}
        <mesh position={[1.05, 0.45, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.5, 1.1, 18]} />
          <meshStandardMaterial color="#06241f" />
        </mesh>
        {/* Spinning sensor mast */}
        <mesh ref={mast} position={[0, 0.95, 0]}>
          <cylinderGeometry args={[0.28, 0.28, 0.5, 16]} />
          <meshStandardMaterial color="#facc15" emissive="#5c4a00" />
        </mesh>
      </group>

      {/* Safety ring */}
      <lineLoop ref={ring} geometry={ringGeom}>
        <lineBasicMaterial color="#2dd4bf" transparent opacity={0.35} />
      </lineLoop>
    </>
  );
}
