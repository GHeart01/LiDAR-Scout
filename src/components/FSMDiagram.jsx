import { useStore } from "../store.js";
import { STATES, NODE_POS, TRANSITIONS } from "../sim/fsmConfig.js";

const R = 28;

// Move a point from a node center toward (tx,ty) by the node radius.
function trim(node, tx, ty) {
  const dx = tx - node.x;
  const dy = ty - node.y;
  const l = Math.hypot(dx, dy) || 1;
  return { x: node.x + (dx / l) * R, y: node.y + (dy / l) * R };
}

function Edge({ t }) {
  const a = NODE_POS[t.from];
  const b = NODE_POS[t.to];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const curve = 24;
  const cx = (a.x + b.x) / 2 + (-dy / len) * curve;
  const cy = (a.y + b.y) / 2 + (dx / len) * curve;
  const s = trim(a, cx, cy);
  const e = trim(b, cx, cy);
  return (
    <g className="fsm-edge">
      <path d={`M ${s.x} ${s.y} Q ${cx} ${cy} ${e.x} ${e.y}`} markerEnd="url(#arrow)" />
      <text className="fsm-edge-label" x={cx} y={cy}>{t.label}</text>
    </g>
  );
}

export default function FSMDiagram() {
  const fsmState = useStore((s) => s.fsmState);
  return (
    <div className="panel">
      <h2>Robot FSM</h2>
      <svg className="fsm-svg" viewBox="0 0 360 210">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3a4d73" />
          </marker>
        </defs>

        {TRANSITIONS.map((t, i) => (
          <Edge key={i} t={t} />
        ))}

        {STATES.map((s) => {
          const p = NODE_POS[s];
          return (
            <g key={s} className={"fsm-node" + (s === fsmState ? " active" : "")}>
              <circle cx={p.x} cy={p.y} r={R} />
              <text x={p.x} y={p.y}>{s}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
