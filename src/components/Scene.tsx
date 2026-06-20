import { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { ARENA } from "../sim/constants";
import { createWebGPURenderer, type Backend } from "../renderer";
import { useStore } from "../store";
import Arena from "./Arena";
import Obstacles from "./Obstacles";
import Robots from "./Robots";
import Prey from "./Prey";
import DiscoveredMap from "./DiscoveredMap";
import SimulationRunner from "./SimulationRunner";

function ViewController() {
  const view = useStore((s) => s.view);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as
    | { target: { set: (x: number, y: number, z: number) => void }; enableRotate: boolean; update: () => void }
    | undefined;

  useEffect(() => {
    if (!controls) return;
    controls.target.set(0, 0, 0);
    if (view === "top") {
      camera.position.set(0, 95, 0.001);
      controls.enableRotate = false;
    } else {
      camera.position.set(34, 30, 34);
      controls.enableRotate = true;
    }
    controls.update();
  }, [view, controls, camera]);

  return null;
}

export default function Scene({ backend = "webgl" }: { backend?: Backend }) {
  const effects = backend === "webgl";
  const gl = backend === "webgpu" ? createWebGPURenderer : { antialias: true };

  return (
    <Canvas
      gl={gl as never}
      camera={{ position: [34, 30, 34], fov: 45, near: 0.1, far: 1000 }}
      dpr={[1, 2]}
    >
      <color attach="background" args={["#070d18"]} />
      <fogExp2 attach="fog" args={["#070d18", 0.006]} />

      <hemisphereLight args={["#bfe9ff", "#0a1424", 0.9]} />
      <directionalLight position={[20, 40, 10]} intensity={0.7} />
      <pointLight position={[0, 18, 0]} intensity={0.4} color="#2dd4bf" distance={90} />

      <Arena reflective={effects} />
      <DiscoveredMap />
      <Obstacles />
      <Robots />
      <Prey />
      <SimulationRunner />

      {effects && (
        <ContactShadows position={[0, 0.03, 0]} scale={ARENA * 2.4} blur={2.4} far={6} opacity={0.5} color="#000000" />
      )}

      <OrbitControls makeDefault enablePan={false} minDistance={18} maxDistance={140} maxPolarAngle={Math.PI / 2 - 0.04} />
      <ViewController />

      {effects && (
        <EffectComposer enableNormalPass={false}>
          <Bloom intensity={0.85} luminanceThreshold={0.2} luminanceSmoothing={0.35} mipmapBlur />
          <Vignette offset={0.25} darkness={0.85} eskil={false} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
