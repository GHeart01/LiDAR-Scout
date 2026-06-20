import { useStore } from "../store";
import { world } from "../sim/instance";

function Sparkline({ data, color, max, unit, label, value }: {
  data: number[];
  color: string;
  max: number;
  unit: string;
  label: string;
  value: string;
}) {
  const W = 300;
  const H = 40;
  const n = data.length;
  let path = "";
  if (n > 1) {
    path = data
      .map((v, i) => {
        const x = (i / (n - 1)) * W;
        const y = H - Math.max(0, Math.min(1, v / max)) * (H - 4) - 2;
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }
  return (
    <div className="spark">
      <div className="spark-head">
        <span>{label}</span>
        <b style={{ color }}>{value}{unit}</b>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="spark-svg">
        <line x1="0" y1={H - 2} x2={W} y2={H - 2} stroke="#1d2c49" strokeWidth="1" />
        {path && <path d={path} fill="none" stroke={color} strokeWidth="1.6" />}
      </svg>
    </div>
  );
}

export default function Telemetry() {
  const coverageHistory = useStore((s) => s.coverageHistory);
  const frontHistories = useStore((s) => s.frontHistories);
  const readouts = useStore((s) => s.readouts);
  const coverage = useStore((s) => s.coverage);
  const range = useStore((s) => s.sensorRange);
  const robotCount = useStore((s) => s.robotCount);

  return (
    <div className="panel">
      <h2>Telemetry</h2>
      <Sparkline
        data={coverageHistory}
        color="#22d3ee"
        max={100}
        unit="%"
        label="Map coverage (shared)"
        value={(coverage * 100).toFixed(1)}
      />
      {Array.from({ length: robotCount }, (_, i) => {
        const color = world.robots[i]?.color ?? "#2dd4bf";
        const front = readouts[i]?.front ?? 0;
        return (
          <Sparkline
            key={i}
            data={frontHistories[i] ?? []}
            color={color}
            max={range}
            unit="m"
            label={`#${i} front clearance`}
            value={front >= range ? "clear" : front.toFixed(1)}
          />
        );
      })}
    </div>
  );
}
