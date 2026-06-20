import { useEffect, useRef } from "react";
import { ARENA } from "../sim/constants.js";
import { addTarget, removeTarget } from "../sim/instance.js";

// A wall that registers itself as a LiDAR target.
function Wall({ position, size }) {
  const ref = useRef();
  useEffect(() => {
    const mesh = ref.current;
    addTarget(mesh);
    return () => removeTarget(mesh);
  }, []);
  return (
    <mesh ref={ref} position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#33456b" />
    </mesh>
  );
}

export default function Arena() {
  const t = 1;
  const span = ARENA * 2 + t;
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[ARENA * 2, ARENA * 2]} />
        <meshStandardMaterial color="#0e1830" roughness={1} />
      </mesh>

      {/* Grid */}
      <gridHelper args={[ARENA * 2, ARENA, "#1d2c49", "#16233d"]} position={[0, 0.01, 0]} />

      {/* Walls */}
      <Wall position={[0, 1.1, -ARENA]} size={[span, 2.2, t]} />
      <Wall position={[0, 1.1, ARENA]} size={[span, 2.2, t]} />
      <Wall position={[-ARENA, 1.1, 0]} size={[t, 2.2, span]} />
      <Wall position={[ARENA, 1.1, 0]} size={[t, 2.2, span]} />
    </group>
  );
}
