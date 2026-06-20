import * as THREE from "three";
import { simulation } from "../sim/instance.js";
import { ARENA } from "../sim/constants.js";
import { useStore } from "../store.js";

function Slider({ label, paramKey, min, max, step, format }) {
  const value = useStore((s) => s[paramKey]);
  const setParam = useStore((s) => s.setParam);
  return (
    <label className="slider">
      {label} <output>{format(value)}</output>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setParam(paramKey, parseFloat(e.target.value))}
      />
    </label>
  );
}

export default function Controls() {
  const running = useStore((s) => s.running);
  const paused = useStore((s) => s.paused);
  const setRunning = useStore((s) => s.setRunning);
  const setPaused = useStore((s) => s.setPaused);
  const setFsmState = useStore((s) => s.setFsmState);
  const addObstacle = useStore((s) => s.addObstacle);
  const removeObstacle = useStore((s) => s.removeObstacle);
  const resetObstacles = useStore((s) => s.resetObstacles);

  const toggleRun = () => {
    if (!running) {
      simulation.setState("SCAN");
      setRunning(true);
    } else {
      simulation.setState("IDLE");
      setRunning(false);
    }
    setFsmState(simulation.fsmState);
  };

  const reset = () => {
    simulation.reset();
    resetObstacles();
    setRunning(false);
    setPaused(false);
    setFsmState("IDLE");
  };

  const add = () => {
    const x = THREE.MathUtils.randFloatSpread(ARENA * 1.4);
    const z = THREE.MathUtils.randFloatSpread(ARENA * 1.4);
    addObstacle({ x, z });
  };

  return (
    <div className="panel">
      <h2>Controls</h2>
      <div className="btn-row">
        <button className={running ? "" : "primary"} onClick={toggleRun}>
          {running ? "■ Stop" : "▶ Start"}
        </button>
        <button onClick={reset}>↺ Reset</button>
        <button onClick={() => setPaused(!paused)}>
          {paused ? "▶ Resume" : "⏸ Pause"}
        </button>
      </div>
      <div className="btn-row">
        <button onClick={add}>＋ Obstacle</button>
        <button onClick={removeObstacle}>－ Obstacle</button>
      </div>

      <Slider label="Sim speed" paramKey="simSpeed" min={0.1} max={3} step={0.1}
        format={(v) => v.toFixed(1) + "×"} />
      <Slider label="Drive speed" paramKey="driveSpeed" min={1} max={14} step={0.5}
        format={(v) => String(v)} />
      <Slider label="Sweep rate" paramKey="sweepRate" min={60} max={720} step={20}
        format={(v) => v + "°/s"} />
      <Slider label="Safe distance" paramKey="safeDist" min={2} max={12} step={0.5}
        format={(v) => v.toFixed(1)} />
    </div>
  );
}
