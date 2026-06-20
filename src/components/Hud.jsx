import { useStore } from "../store.js";

function fmtDist(v, max = 30) {
  if (v >= max) return "clear";
  return v.toFixed(2) + " m";
}

export default function Hud() {
  const fsmState = useStore((s) => s.fsmState);
  const r = useStore((s) => s.readout);

  return (
    <>
      <div id="hud">
        <div className="hud-row"><span>STATE</span><b id="hud-state">{fsmState}</b></div>
        <div className="hud-row"><span>FRONT</span><b>{fmtDist(r.front)}</b></div>
        <div className="hud-row">
          <span>NEAREST</span>
          <b>{r.nearest >= 30 ? "—" : r.nearest.toFixed(2) + " m"}</b>
        </div>
        <div className="hud-row"><span>HEADING</span><b>{r.heading.toFixed(0)}°</b></div>
        <div className="hud-row">
          <span>POS</span>
          <b>{r.x.toFixed(1)}, {r.z.toFixed(1)}</b>
        </div>
      </div>

      <div id="legend">
        <span><i className="dot beam" />active beam</span>
        <span><i className="dot hit" />live scan</span>
        <span><i className="dot map" />discovered map</span>
        <span><i className="dot safe" />safety ring</span>
        <span className="hint">drag robot/boxes to move · drag empty space to orbit · scroll to zoom</span>
      </div>
    </>
  );
}
