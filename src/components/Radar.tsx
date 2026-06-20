import { useEffect, useRef } from "react";
import { world } from "../sim/instance";
import { useStore } from "../store";

// One polar scan plot for a single robot, oriented to its heading.
function RobotRadar({ index }: { index: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const setSelectedRobot = useStore((s) => s.setSelectedRobot);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const S = canvas.width;
    const cx = S / 2;
    const cy = S / 2;
    const Rad = S / 2 - 6;
    let raf = 0;

    const draw = () => {
      const r = world.robots[index];
      ctx.clearRect(0, 0, S, S);
      ctx.strokeStyle = "#1d2c49";
      ctx.lineWidth = 1;
      for (let i = 1; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (Rad * i) / 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (r) {
        const headingDeg = r.headingDeg();
        const scale = Rad / r.maxRange;
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.moveTo(cx, cy - Rad - 1);
        ctx.lineTo(cx - 4, cy - Rad + 7);
        ctx.lineTo(cx + 4, cy - Rad + 7);
        ctx.closePath();
        ctx.fill();
        for (let d = 0; d < 360; d++) {
          if (!r.valid[d]) continue;
          const rel = ((d - headingDeg) * Math.PI) / 180;
          const dist = r.distances[d] * scale;
          const x = cx + Math.sin(rel) * dist;
          const y = cy - Math.cos(rel) * dist;
          const t = r.distances[d] / r.maxRange;
          ctx.fillStyle = t < 0.35 ? "#f87171" : t < 0.7 ? "#facc15" : "#34d399";
          ctx.fillRect(x - 1, y - 1, 2, 2);
        }
      }
      ctx.fillStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fill();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [index]);

  const color = world.robots[index]?.color ?? "#2dd4bf";
  const name = world.robots[index]?.name ?? `#${index}`;
  return (
    <div className="radar-cell" onClick={() => setSelectedRobot(index)}>
      <div className="radar-label">
        <i className="dot" style={{ background: color }} /> {name}
      </div>
      <canvas ref={canvasRef} width={120} height={120} className="radar-canvas" />
    </div>
  );
}

export default function Radar() {
  const robotCount = useStore((s) => s.robotCount);
  return (
    <div className="panel">
      <h2>LiDAR scans</h2>
      <div className="radar-grid">
        {Array.from({ length: robotCount }, (_, i) => (
          <RobotRadar key={i} index={i} />
        ))}
      </div>
    </div>
  );
}
