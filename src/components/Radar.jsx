import { useEffect, useRef } from "react";
import { simulation } from "../sim/instance.js";
import { useStore } from "../store.js";

// 2D polar plot of the live LiDAR scan, oriented so the robot heading points up.
export default function Radar() {
  const canvasRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const S = canvas.width;
    const cx = S / 2;
    const cy = S / 2;
    const Rad = S / 2 - 10;
    let raf;

    const draw = () => {
      const sim = simulation;
      const safeDist = useStore.getState().safeDist;
      const headingDeg = sim.headingDeg();
      const scale = Rad / sim.maxRange;

      ctx.clearRect(0, 0, S, S);

      // Range rings + cross hairs
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

      // Safety ring
      ctx.strokeStyle = "rgba(45,212,191,0.6)";
      ctx.beginPath();
      ctx.arc(cx, cy, safeDist * scale, 0, Math.PI * 2);
      ctx.stroke();

      // Heading marker (up)
      ctx.fillStyle = "#2dd4bf";
      ctx.beginPath();
      ctx.moveTo(cx, cy - Rad - 1);
      ctx.lineTo(cx - 5, cy - Rad + 9);
      ctx.lineTo(cx + 5, cy - Rad + 9);
      ctx.closePath();
      ctx.fill();

      // Scan points
      for (let d = 0; d < 360; d++) {
        if (!sim.valid[d]) continue;
        const rel = ((d - headingDeg) * Math.PI) / 180;
        const dist = sim.distances[d] * scale;
        const x = cx + Math.sin(rel) * dist;
        const y = cy - Math.cos(rel) * dist;
        const t = sim.distances[d] / sim.maxRange;
        ctx.fillStyle = t < 0.35 ? "#f87171" : t < 0.7 ? "#facc15" : "#34d399";
        ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
      }

      // Robot center
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
