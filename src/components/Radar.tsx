import { useEffect, useRef } from "react";
import { world } from "../sim/instance";
import { useStore } from "../store";

// 2D polar plot of the selected robot's live scan, oriented to its heading.
export default function Radar() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const S = canvas.width;
    const cx = S / 2;
    const cy = S / 2;
    const Rad = S / 2 - 10;
    let raf = 0;

    const draw = () => {
      const sel = useStore.getState().selectedRobot;
      const r = world.robots[Math.min(sel, world.robots.length - 1)];
      ctx.clearRect(0, 0, S, S);

      ctx.strokeStyle = "#1d2c49";
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (Rad * i) / 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(cx, cy - Rad); ctx.lineTo(cx, cy + Rad);
      ctx.moveTo(cx - Rad, cy); ctx.lineTo(cx + Rad, cy);
      ctx.stroke();

      if (r) {
        const headingDeg = r.headingDeg();
        const scale = Rad / r.maxRange;
        ctx.fillStyle = "#2dd4bf";
        ctx.beginPath();
        ctx.moveTo(cx, cy - Rad - 1);
        ctx.lineTo(cx - 5, cy - Rad + 9);
        ctx.lineTo(cx + 5, cy - Rad + 9);
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
          ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
        }
      }

      ctx.fillStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="panel">
      <h2>LiDAR scan</h2>
      <canvas ref={canvasRef} width={260} height={260} id="radar" />
    </div>
  );
}
