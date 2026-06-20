import Scene from "./components/Scene.jsx";
import Hud from "./components/Hud.jsx";
import ViewToggle from "./components/ViewToggle.jsx";
import Controls from "./components/Controls.jsx";
import FSMDiagram from "./components/FSMDiagram.jsx";
import Radar from "./components/Radar.jsx";

export default function App() {
  return (
    <div id="app">
      <section id="viewport">
        <Scene />
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
