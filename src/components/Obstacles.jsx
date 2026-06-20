import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ARENA } from "../sim/constants.js";
import { addTarget, removeTarget } from "../sim/instance.js";
import { useStore } from "../store.js";

const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const HIT = new THREE.Vector3();

function clamp(v) {
  const lim = ARENA - 1.6;
  return THREE.MathUtils.clamp(v, -lim, lim);
}

function Obstacle({ o }) {
  const ref = useRef();
  const dragging = useRef(false);
  const controls = useThree((s) => s.controls);
  const setObstaclePos = useStore((s) => s.setObstaclePos);

  useEffect(() => {
    const mesh = ref.current;
    addTarget(mesh);
    return () => removeTarget(mesh);
  }, []);

  return (
    <mesh
      ref={ref}
      position={[o.x, 1, o.z]}
      onPointerDown={(e) => {
        e.stopPropagation();
        dragging.current = true;
        if (controls) controls.enabled = false;
        e.target.setPointerCapture(e.pointerId);
      }}
      onPointerUp={(e) => {
        dragging.current = false;
        if (controls) controls.enabled = true;
        e.target.releasePointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        e.ray.intersectPlane(GROUND, HIT);
        setObstaclePos(o.id, clamp(HIT.x), clamp(HIT.z));
      }}
    >
      <boxGeometry args={[o.w, 2, o.d]} />
      <meshStandardMaterial color="#64748b" roughness={0.8} />
    </mesh>
  );
}

export default function Obstacles() {
  const obstacles = useStore((s) => s.obstacles);
  return (
    <group>
      {obstacles.map((o) => (
        <Obstacle key={o.id} o={o} />
      ))}
    </group>
  );
}
