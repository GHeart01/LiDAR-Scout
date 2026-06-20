import { useStore } from "../store";

function Sparkline({ data, color, max, unit, label, value }: {
  data: number[];
  color: string;
  max: number;
  unit: string;
  label: string;
  value: string;
}) {
  const W = 300;
  const H = 46;
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
  const frontHistory = useStore((s) => s.frontHistory);
  const coverage = useStore((s) => s.coverage);
  const range = useStore((s) => s.sensorRange);
  const front = useStore((s) => s.readout.front);

  return (
    <div className="panel">
      <h2>Telemetry</h2>
      <Sparkline
        data={coverageHistory}
        color="#22d3ee"
        max={100}
        unit="%"
        label="Map coverage"
        value={(coverage * 100).toFixed(1)}
      />
      <Sparkline
        data={frontHistory}
        color="#facc15"
        max={range}
        unit="m"
        label="Front clearance"
        value={front >= range ? "clear" : front.toFixed(1)}
      />
    </div>
  );
}
