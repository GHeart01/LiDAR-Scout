import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { world } from "../sim/instance";
import type { VehicleType } from "../sim/vehicles";

interface ModelProps {
  index: number;
  color: string;
  selected: boolean;
}

const moving = (index: number) => {
  const s = world.robots[index]?.state;
  return s === "CHASE" || s === "AVOID";
};

// ---- Rover: cylinder chassis + heading cone + spinning sensor mast ---------
function Rover({ color, selected }: ModelProps) {
  const mast = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (mast.current) mast.current.rotation.y += dt * 6;
  });
  return (
    <group>
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[1.1, 1.1, 0.7, 26]} />
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.4} emissive={color} emissiveIntensity={selected ? 0.7 : 0.35} />
      </mesh>
      <mesh position={[1.0, 0.45, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.48, 1.05, 18]} />
        <meshStandardMaterial color="#06241f" />
      </mesh>
      <mesh ref={mast} position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.5, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ---- Drone: quad-rotor that hovers and bobs --------------------------------
function Drone({ index, color, selected }: ModelProps) {
  const body = useRef<THREE.Group>(null);
  const rotors = useRef<THREE.Mesh[]>([]);
  useFrame((_, dt) => {
    if (body.current) body.current.position.y = 1.6 + Math.sin(world.time * 3) * 0.12;
    for (const r of rotors.current) if (r) r.rotation.y += dt * 40;
  });
  const arms: [number, number][] = [
    [0.7, 0.7],
    [0.7, -0.7],
    [-0.7, 0.7],
    [-0.7, -0.7],
  ];
  return (
    <group ref={body} position={[0, 1.6, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.9, 0.3, 0.9]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.4} emissive={color} emissiveIntensity={selected ? 0.9 : 0.5} toneMapped={false} />
      </mesh>
      {/* heading marker */}
      <mesh position={[0.7, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.18, 0.5, 12]} />
        <meshStandardMaterial color="#06241f" />
      </mesh>
      {arms.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh rotation={[0, Math.atan2(z, x), 0]}>
            <boxGeometry args={[0.9, 0.08, 0.12]} />
            <meshStandardMaterial color="#1b2942" />
          </mesh>
          <mesh ref={(m) => m && (rotors.current[i] = m)} position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.45, 0.45, 0.04, 16]} />
            <meshStandardMaterial color="#0a1326" transparent opacity={0.45} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---- Car: chassis + cabin + four rolling wheels ----------------------------
function Wheel({ x, z, spin }: { x: number; z: number; spin: React.MutableRefObject<THREE.Group | null> }) {
  return (
    <group position={[x, 0.3, z]} ref={spin as never}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.34, 0.34, 0.25, 16]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} />
      </mesh>
    </group>
  );
}

function Car({ index, color, selected }: ModelProps) {
  const wheels = useRef<(THREE.Group | null)[]>([null, null, null, null]);
  useFrame((_, dt) => {
    if (!moving(index)) return;
    const spin = dt * world.speedScale * 12;
    for (const w of wheels.current) if (w) w.rotation.x += spin;
  });
  const w0 = useRef<THREE.Group>(null);
  const w1 = useRef<THREE.Group>(null);
  const w2 = useRef<THREE.Group>(null);
  const w3 = useRef<THREE.Group>(null);
  wheels.current = [w0.current, w1.current, w2.current, w3.current];
  return (
    <group>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[2.0, 0.4, 1.1]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.4} emissive={color} emissiveIntensity={selected ? 0.6 : 0.3} />
      </mesh>
      <mesh position={[-0.2, 0.85, 0]} castShadow>
        <boxGeometry args={[1.0, 0.45, 0.95]} />
        <meshStandardMaterial color="#1b2942" metalness={0.3} roughness={0.5} />
      </mesh>
      {/* headlight / heading */}
      <mesh position={[1.05, 0.5, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.18, 0.4, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.0} toneMapped={false} />
      </mesh>
      <Wheel x={0.7} z={0.62} spin={w0} />
      <Wheel x={-0.7} z={0.62} spin={w1} />
      <Wheel x={0.7} z={-0.62} spin={w2} />
      <Wheel x={-0.7} z={-0.62} spin={w3} />
    </group>
  );
}

// ---- Humanoid: torso, head, swinging arms + legs ---------------------------
function Humanoid({ index, color, selected }: ModelProps) {
  const lLeg = useRef<THREE.Group>(null);
  const rLeg = useRef<THREE.Group>(null);
  const lArm = useRef<THREE.Group>(null);
  const rArm = useRef<THREE.Group>(null);
  const phase = useRef(0);
  useFrame((_, dt) => {
    if (moving(index)) phase.current += dt * 7;
    const s = Math.sin(phase.current) * 0.5;
    if (lLeg.current) lLeg.current.rotation.x = s;
    if (rLeg.current) rLeg.current.rotation.x = -s;
    if (lArm.current) lArm.current.rotation.x = -s;
    if (rArm.current) rArm.current.rotation.x = s;
  });
  return (
    <group>
      <mesh position={[0, 1.15, 0]} castShadow>
        <boxGeometry args={[0.55, 0.8, 0.35]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.5} emissive={color} emissiveIntensity={selected ? 0.6 : 0.3} />
      </mesh>
      <mesh position={[0, 1.75, 0]} castShadow>
        <sphereGeometry args={[0.26, 16, 16]} />
        <meshStandardMaterial color="#1b2942" />
      </mesh>
      {/* visor (heading + glow) */}
      <mesh position={[0.22, 1.78, 0]}>
        <boxGeometry args={[0.12, 0.1, 0.3]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
      <group ref={lArm} position={[0.42, 1.4, 0]}>
        <mesh position={[0, -0.35, 0]} castShadow>
          <boxGeometry args={[0.16, 0.7, 0.16]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      </group>
      <group ref={rArm} position={[-0.42, 1.4, 0]}>
        <mesh position={[0, -0.35, 0]} castShadow>
          <boxGeometry args={[0.16, 0.7, 0.16]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      </group>
      <group ref={lLeg} position={[0.16, 0.75, 0]}>
        <mesh position={[0, -0.38, 0]} castShadow>
          <boxGeometry args={[0.2, 0.78, 0.2]} />
          <meshStandardMaterial color="#1b2942" />
        </mesh>
      </group>
      <group ref={rLeg} position={[-0.16, 0.75, 0]}>
        <mesh position={[0, -0.38, 0]} castShadow>
          <boxGeometry args={[0.2, 0.78, 0.2]} />
          <meshStandardMaterial color="#1b2942" />
        </mesh>
      </group>
    </group>
  );
}

export default function VehicleModel({ type, ...props }: ModelProps & { type: VehicleType }) {
  switch (type) {
    case "drone":
      return <Drone {...props} />;
    case "car":
      return <Car {...props} />;
    case "humanoid":
      return <Humanoid {...props} />;
    default:
      return <Rover {...props} />;
  }
}
