import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { world } from "../sim/instance";

// The roaming yellow light the robots chase (glows under bloom).
export default function Prey() {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const p = world.prey;
    if (group.current) {
      group.current.position.set(p.position.x, 0.7 + Math.sin(world.time * 4) * 0.15, p.position.z);
    }
  });
  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[0.5, 20, 20]} />
        <meshStandardMaterial color="#ffe100" emissive="#ffe100" emissiveIntensity={2.6} toneMapped={false} />
      </mesh>
      <pointLight color="#ffe100" intensity={1.4} distance={14} />
    </group>
  );
}
