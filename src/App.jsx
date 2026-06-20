import { useEffect } from "react";
import Scene from "./components/Scene.jsx";
import Hud from "./components/Hud.jsx";
import ViewToggle from "./components/ViewToggle.jsx";
import Controls from "./components/Controls.jsx";
import FSMDiagram from "./components/FSMDiagram.jsx";
import Radar from "./components/Radar.jsx";
import RendererBoundary from "./components/RendererBoundary.jsx";
import { useStore } from "./store.js";
import { detectWebGPU, chooseBackend } from "./renderer.js";

export default function App() {
  const rendererMode = useStore((s) => s.rendererMode);
  const webgpuAvailable = useStore((s) => s.webgpuAvailable);
  const activeBackend = useStore((s) => s.activeBackend);
  const setWebgpuAvailable = useStore((s) => s.setWebgpuAvailable);
  const setActiveBackend = useStore((s) => s.setActiveBackend);

  // Probe WebGPU support once.
  useEffect(() => {
    let cancelled = false;
    detectWebGPU().then((ok) => {
      if (!cancelled) setWebgpuAvailable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [setWebgpuAvailable]);

  // Resolve the active backend whenever the mode or capability changes.
  useEffect(() => {
    setActiveBackend(chooseBackend(rendererMode, webgpuAvailable));
  }, [rendererMode, webgpuAvailable, setActiveBackend]);

  // Runtime fallback if a WebGPU canvas throws during init/commit.
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
          <p>Top-down sweeping-LiDAR robot simulator</p>
        </header>
        <Controls />
        <FSMDiagram />
        <Radar />
      </aside>
    </div>
  );
}
