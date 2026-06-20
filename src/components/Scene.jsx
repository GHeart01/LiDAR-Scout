import { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useStore } from "../store.js";
import Arena from "./Arena.jsx";
import Obstacles from "./Obstacles.jsx";
import Robot from "./Robot.jsx";
import LidarVisuals from "./LidarVisuals.jsx";
import SimulationRunner from "./SimulationRunner.jsx";

// Positions the orbit camera for the selected view.
// 'iso' = tilted 3D (free orbit), 'top' = locked top-down.
function ViewController() {
  const view = useStore((s) => s.view);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);

  useEffect(() => {
    if (!controls) return;
    controls.target.set(0, 0, 0);
    if (view === "top") {
      camera.position.set(0, 95, 0.001); // tiny offset avoids gimbal lock
      controls.enableRotate = false;
    } else {
      camera.position.set(34, 30, 34);
      controls.enableRotate = true;
    }
    controls.update();
  }, [view, controls, camera]);

  return null;
}

export default function Scene() {
  return (
    <Canvas
      camera={{ position: [34, 30, 34], fov: 45, near: 0.1, far: 1000 }}
      gl={{ antialias: true }}
      dpr={[1, 2]}
    >
      <color attach="background" args={["#0b1120"]} />
      <hemisphereLight args={["#bfe9ff", "#10203a", 1.1]} />
      <directionalLight position={[20, 40, 10]} intensity={0.7} />

      <Arena />
      <Obstacles />
      <Robot />
      <LidarVisuals />
      <SimulationRunner />

      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={18}
        maxDistance={140}
        maxPolarAngle={Math.PI / 2 - 0.04}
      />
      <ViewController />
    </Canvas>
  );
}
