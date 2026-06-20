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

  // Keep the world's robot count in sync with the UI.
  useEffect(() => {
    world.setRobotCount(robotCount);
  }, [robotCount]);

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
        </header>
        <Controls />
        <Telemetry />
        <FSMDiagram />
        <Radar />
      </aside>
    </div>
  );
}
