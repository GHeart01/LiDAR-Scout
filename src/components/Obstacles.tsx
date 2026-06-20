import { useEffect, useRef } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { ARENA } from "../sim/constants";
import { addTarget, removeTarget } from "../sim/instance";
import { useStore, type Obstacle as ObstacleType } from "../store";

const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const HIT = new THREE.Vector3();

function clamp(v: number): number {
  const lim = ARENA - 1.6;
  return THREE.MathUtils.clamp(v, -lim, lim);
}

function Obstacle({ o }: { o: ObstacleType }) {
  const ref = useRef<THREE.Mesh>(null);
  const dragging = useRef(false);
  const controls = useThree((s) => s.controls) as unknown as { enabled: boolean } | undefined;
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
      castShadow
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        dragging.current = true;
        if (controls) controls.enabled = false;
        (e.target as Element).setPointerCapture?.(e.pointerId);
      }}
      onPointerUp={(e: ThreeEvent<PointerEvent>) => {
        dragging.current = false;
        if (controls) controls.enabled = true;
        (e.target as Element).releasePointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        if (!dragging.current) return;
        e.ray.intersectPlane(GROUND, HIT);
        setObstaclePos(o.id, clamp(HIT.x), clamp(HIT.z));
      }}
    >
      <boxGeometry args={[o.w, 2, o.d]} />
      <meshStandardMaterial color="#64748b" roughness={0.75} metalness={0.15} />
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
