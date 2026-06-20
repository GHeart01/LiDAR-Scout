import { useStore } from "../store";
import { world } from "../sim/instance";

function fmtDist(v: number, max = 30): string {
  return v >= max ? "clear" : v.toFixed(2) + " m";
}

const DEFAULT_READOUT = { state: "IDLE" as const, front: 0, nearest: 0, heading: 0, x: 0, z: 0 };

export default function Hud() {
  const readouts = useStore((s) => s.readouts);
  const coverage = useStore((s) => s.coverage);
  const fps = useStore((s) => s.fps);
  const selected = useStore((s) => s.selectedRobot);
  const r = readouts[selected] ?? DEFAULT_READOUT;
  const robotColor = world.robots[selected]?.color ?? "#2dd4bf";

  return (
    <>
      <div id="hud">
        <div className="hud-row">
          <span>ROBOT</span>
          <b style={{ color: robotColor }}>#{selected}</b>
        </div>
        <div className="hud-row"><span>STATE</span><b id="hud-state">{r.state}</b></div>
        <div className="hud-row"><span>FRONT</span><b>{fmtDist(r.front)}</b></div>
        <div className="hud-row"><span>COVERAGE</span><b>{(coverage * 100).toFixed(1)}%</b></div>
        <div className="hud-row"><span>HEADING</span><b>{r.heading.toFixed(0)}°</b></div>
        <div className="hud-row"><span>FPS</span><b>{fps.toFixed(0)}</b></div>
      </div>

      <div id="legend">
        <span><i className="dot beam" />active beam</span>
        <span><i className="dot hit" />live scan</span>
        <span><i className="dot map" />discovered map</span>
        <span className="hint">drag robots/boxes to move · drag empty space to orbit · scroll to zoom</span>
      </div>
    </>
  );
}
