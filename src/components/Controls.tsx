import { world } from "../sim/instance";
import { useStore, type NumericParam } from "../store";
import { SCENARIO_NAMES, type ScenarioName } from "../scenarios";

function Slider({ label, paramKey, min, max, step, format }: {
  label: string;
  paramKey: NumericParam;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}) {
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
  const showMap = useStore((s) => s.showMap);
  const robotCount = useStore((s) => s.robotCount);
  const scenario = useStore((s) => s.scenario);
  const setRunning = useStore((s) => s.setRunning);
  const setPaused = useStore((s) => s.setPaused);
  const setShowMap = useStore((s) => s.setShowMap);
  const setRobotCount = useStore((s) => s.setRobotCount);
  const setSelectedRobot = useStore((s) => s.setSelectedRobot);
  const loadScenario = useStore((s) => s.loadScenario);
  const resetTelemetry = useStore((s) => s.resetTelemetry);

  const toggleRun = () => {
    if (!running) {
      world.start();
      setRunning(true);
    } else {
      world.stop();
      setRunning(false);
    }
  };

  const reset = () => {
    world.reset();
    setRunning(false);
    setPaused(false);
    resetTelemetry();
  };

  const pickScenario = (name: ScenarioName) => {
    loadScenario(name);
    world.reset();
    setRunning(false);
    resetTelemetry();
  };

  const changeCount = (n: number) => {
    setRobotCount(n);
    setSelectedRobot(Math.min(useStore.getState().selectedRobot, n - 1));
    world.setRobotCount(n);
    resetTelemetry();
  };

  return (
    <div className="panel">
      <h2>Controls</h2>
      <div className="btn-row">
        <button className={running ? "" : "primary"} onClick={toggleRun}>
          {running ? "■ Stop" : "▶ Explore"}
        </button>
        <button onClick={reset}>↺ Reset</button>
        <button onClick={() => setPaused(!paused)}>{paused ? "▶ Resume" : "⏸ Pause"}</button>
      </div>

      <label className="field">Scenario</label>
      <div className="seg">
        {SCENARIO_NAMES.map((name) => (
          <button
            key={name}
            className={"seg-btn" + (scenario === name ? " active" : "")}
            onClick={() => pickScenario(name)}
          >
            {name}
          </button>
        ))}
      </div>

      <label className="field">Robots</label>
      <div className="seg">
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            className={"seg-btn" + (robotCount === n ? " active" : "")}
            onClick={() => changeCount(n)}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="btn-row" style={{ marginTop: 10 }}>
        <button className={showMap ? "primary" : ""} onClick={() => setShowMap(!showMap)}>
          🗺 Discovered map: {showMap ? "On" : "Off"}
        </button>
      </div>

      <Slider label="Sim speed" paramKey="simSpeed" min={0.1} max={3} step={0.1} format={(v) => v.toFixed(1) + "×"} />
      <Slider label="Drive speed" paramKey="driveSpeed" min={1} max={14} step={0.5} format={(v) => String(v)} />
      <Slider label="Safe distance" paramKey="safeDist" min={2} max={10} step={0.5} format={(v) => v.toFixed(1)} />

      <h2 style={{ marginTop: 16 }}>LiDAR sensor</h2>
      <Slider label="Range" paramKey="sensorRange" min={10} max={30} step={1} format={(v) => v + " m"} />
      <Slider label="Sweep rate" paramKey="sweepRate" min={60} max={720} step={20} format={(v) => v + "°/s"} />
      <Slider label="Resolution" paramKey="beams" min={30} max={360} step={30} format={(v) => v + " beams"} />
      <Slider label="FOV" paramKey="fovDeg" min={60} max={360} step={30} format={(v) => v + "°"} />
      <Slider label="Range noise" paramKey="noiseStd" min={0} max={0.3} step={0.01} format={(v) => v.toFixed(2) + " m"} />
      <Slider label="Dropout" paramKey="dropout" min={0} max={0.2} step={0.01} format={(v) => (v * 100).toFixed(0) + "%"} />
    </div>
  );
}
