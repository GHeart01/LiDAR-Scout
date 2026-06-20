import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { world } from "../sim/instance";
import { useStore } from "../store";

// Steps the world each frame and mirrors readouts/telemetry into the store
// (throttled) so DOM panels render without touching the 3D tree.
export default function SimulationRunner() {
  const acc = useRef(0);
  const fps = useRef(60);

  useFrame((_, delta) => {
    const s = useStore.getState();
    if (delta > 0) fps.current += (1 / delta - fps.current) * 0.1;
    if (s.paused) return;

    const dt = Math.min(delta, 0.05) * s.simSpeed;
    world.step(dt, {
      driveSpeed: s.driveSpeed,
      sweepRate: s.sweepRate,
      safeDist: s.safeDist,
      sensor: {
        range: s.sensorRange,
        fovDeg: s.fovDeg,
        beams: s.beams,
        noiseStd: s.noiseStd,
        dropout: s.dropout,
      },
    });

    acc.current += delta;
    if (acc.current >= 0.1) {
      acc.current = 0;
      const r = world.robots[Math.min(s.selectedRobot, world.robots.length - 1)];
      const coverage = world.coverage();
      if (r) {
        const front = r.frontDistance(r.headingDeg(), 20);
        s.setReadout({
          state: r.state,
          front,
          nearest: r.nearest(),
          heading: r.headingDeg(),
          x: r.position.x,
          z: r.position.z,
        });
        s.pushTelemetry(coverage * 100, front);
      }
      s.setStats(coverage, fps.current);
    }
  });

  return null;
}
