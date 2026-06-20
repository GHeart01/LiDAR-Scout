import { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { VIEW } from "../sim/constants.js";
import Arena from "./Arena.jsx";
import Obstacles from "./Obstacles.jsx";
import Robot from "./Robot.jsx";
import LidarVisuals from "./LidarVisuals.jsx";
import SimulationRunner from "./SimulationRunner.jsx";

// Configures the orthographic top-down camera and keeps it fitted on resize.
function CameraRig() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useEffect(() => {
    camera.up.set(0, 0, -1); // +X right, +Z down on screen
    camera.position.set(0, 80, 0);
    camera.lookAt(0, 0, 0);
    camera.zoom = size.height / VIEW;
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

export default function Scene() {
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 80, 0], zoom: 12, near: 0.1, far: 500 }}
      gl={{ antialias: true }}
      dpr={[1, 2]}
    >
      <CameraRig />
      <color attach="background" args={["#0b1120"]} />
      <hemisphereLight args={["#bfe9ff", "#10203a", 1.1]} />
      <directionalLight position={[20, 40, 10]} intensity={0.7} />

      <Arena />
      <Obstacles />
      <Robot />
      <LidarVisuals />
      <SimulationRunner />
    </Canvas>
  );
}
