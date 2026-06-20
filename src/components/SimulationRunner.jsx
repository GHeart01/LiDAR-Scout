import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { simulation, targets } from "../sim/instance.js";
import { useStore } from "../store.js";

// Drives the simulation forward each frame and mirrors readouts into the store
// (throttled) so the DOM panels can render without re-rendering the 3D tree.
export default function SimulationRunner() {
  const acc = useRef(0);

  useFrame((_, delta) => {
    const s = useStore.getState();
    if (s.paused) return;

    const dt = Math.min(delta, 0.05) * s.simSpeed;
    simulation.step(dt, targets, {
      driveSpeed: s.driveSpeed,
      sweepRate: s.sweepRate,
      safeDist: s.safeDist,
    });

    if (simulation.fsmState !== s.fsmState) s.setFsmState(simulation.fsmState);

    // ~10 Hz HUD updates.
    acc.current += delta;
    if (acc.current >= 0.1) {
      acc.current = 0;
      const r = simulation.robot;
      s.setReadout({
        front: simulation.frontDistance(simulation.headingDeg(), 22),
        nearest: simulation.nearest(),
        heading: simulation.headingDeg(),
        x: r.position.x,
        z: r.position.z,
      });
    }
  });

  return null;
}
