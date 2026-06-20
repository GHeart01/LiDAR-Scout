import { useStore } from "../store";
import { world } from "../sim/instance";
import { STATES, NODE_POS, TRANSITIONS, type Transition } from "../sim/fsmConfig";
import type { FsmState } from "../sim/robot";

const R = 27;

function trim(node: { x: number; y: number }, tx: number, ty: number) {
  const dx = tx - node.x;
  const dy = ty - node.y;
  const l = Math.hypot(dx, dy) || 1;
  return { x: node.x + (dx / l) * R, y: node.y + (dy / l) * R };
}

function Edge({ t }: { t: Transition }) {
  const a = NODE_POS[t.from];
  const b = NODE_POS[t.to];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const curve = 22;
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

function RobotFsm({ index, state }: { index: number; state: FsmState }) {
  const color = world.robots[index]?.color ?? "#2dd4bf";
  const name = world.robots[index]?.name ?? `#${index}`;
  return (
    <div className="fsm-robot">
      <div className="fsm-robot-head">
        <i className="dot" style={{ background: color }} /> {name}
        <b style={{ color }}>{state}</b>
      </div>
      <svg className="fsm-svg" viewBox="0 0 360 210">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3a4d73" />
          </marker>
        </defs>
        {TRANSITIONS.map((t, i) => (
          <Edge key={i} t={t} />
        ))}
        {STATES.map((s) => {
          const p = NODE_POS[s];
          const active = s === state;
          return (
            <g key={s} className={"fsm-node" + (active ? " active" : "")}>
              <circle cx={p.x} cy={p.y} r={R} style={active ? { fill: color, stroke: color } : undefined} />
              <text x={p.x} y={p.y}>{s}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function FSMDiagram() {
  const readouts = useStore((s) => s.readouts);
  const robotCount = useStore((s) => s.robotCount);
  return (
    <div className="panel">
      <h2>Robot FSM</h2>
      {Array.from({ length: robotCount }, (_, i) => (
        <RobotFsm key={i} index={i} state={readouts[i]?.state ?? "IDLE"} />
      ))}
    </div>
  );
}
