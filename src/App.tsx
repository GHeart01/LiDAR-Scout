import { useEffect } from "react";
import Scene from "./components/Scene";
import Hud from "./components/Hud";
import ViewToggle from "./components/ViewToggle";
import Controls from "./components/Controls";
import FSMDiagram from "./components/FSMDiagram";
import Radar from "./components/Radar";
import Telemetry from "./components/Telemetry";
import RendererBoundary from "./components/RendererBoundary";
import { useStore } from "./store";
import { world } from "./sim/instance";
import { detectWebGPU, chooseBackend } from "./renderer";

export default function App() {
  const rendererMode = useStore((s) => s.rendererMode);
  const webgpuAvailable = useStore((s) => s.webgpuAvailable);
  const activeBackend = useStore((s) => s.activeBackend);
  const robotCount = useStore((s) => s.robotCount);
  const vehicle = useStore((s) => s.vehicle);
  const setWebgpuAvailable = useStore((s) => s.setWebgpuAvailable);
  const setActiveBackend = useStore((s) => s.setActiveBackend);

  useEffect(() => {
    let cancelled = false;
    detectWebGPU().then((ok) => {
      if (!cancelled) setWebgpuAvailable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [setWebgpuAvailable]);

  useEffect(() => {
    setActiveBackend(chooseBackend(rendererMode, webgpuAvailable));
  }, [rendererMode, webgpuAvailable, setActiveBackend]);

  // Keep the world's robot count + vehicle kinematics in sync with the UI.
  useEffect(() => {
    world.setRobotCount(robotCount);
  }, [robotCount]);

  useEffect(() => {
    world.setVehicle(vehicle);
  }, [vehicle, robotCount]);

  const handleRendererError = () => setActiveBackend("webgl");

  return (
    <div id="app">
      <section id="viewport">
        <RendererBoundary key={activeBackend} backend={activeBackend} onError={handleRendererError}>
          <Scene backend={activeBackend} />
        </RendererBoundary>
        <Hud />
        <ViewToggle />
      </section>

      <aside id="sidebar">
        <header>
          <h1>LiDAR&nbsp;Scout</h1>
          <p>Multi-robot autonomous LiDAR exploration</p>
          <a
            className="repo-link"
            href="https://github.com/GHeart01/LiDAR-Scout"
            target="_blank"
            rel="noreferrer"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path
                fill="currentColor"
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"
              />
            </svg>
            View on GitHub
          </a>
        </header>
        <Controls />
        <Telemetry />
        <FSMDiagram />
        <Radar />
      </aside>
    </div>
  );
}
