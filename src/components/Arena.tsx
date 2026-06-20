import { useEffect, useRef } from "react";
import * as THREE from "three";
import { MeshReflectorMaterial } from "@react-three/drei";
import { ARENA } from "../sim/constants";
import { addTarget, removeTarget } from "../sim/instance";

function Wall({ position, size }: { position: [number, number, number]; size: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);
  useEffect(() => {
    const mesh = ref.current;
    addTarget(mesh);
    return () => removeTarget(mesh);
  }, []);
  return (
    <mesh ref={ref} position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#33456b" roughness={0.6} metalness={0.2} />
    </mesh>
  );
}

export default function Arena({ reflective = true }: { reflective?: boolean }) {
  const t = 1;
  const span = ARENA * 2 + t;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ARENA * 2, ARENA * 2]} />
        {reflective ? (
          <MeshReflectorMaterial
            resolution={1024}
            blur={[300, 90]}
            mixBlur={1}
            mixStrength={18}
            roughness={0.95}
            depthScale={1}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.2}
            color="#0a1424"
            metalness={0.55}
            mirror={0.35}
          />
        ) : (
          <meshStandardMaterial color="#0a1424" metalness={0.6} roughness={0.4} />
        )}
      </mesh>

      <gridHelper args={[ARENA * 2, ARENA, "#1d3a52", "#13243d"]} position={[0, 0.015, 0]} />

      <Wall position={[0, 1.1, -ARENA]} size={[span, 2.2, t]} />
      <Wall position={[0, 1.1, ARENA]} size={[span, 2.2, t]} />
      <Wall position={[-ARENA, 1.1, 0]} size={[t, 2.2, span]} />
      <Wall position={[ARENA, 1.1, 0]} size={[t, 2.2, span]} />
    </group>
  );
}
