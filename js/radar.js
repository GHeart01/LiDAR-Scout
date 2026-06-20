// 2D polar plot of the LiDAR scan, oriented so the robot's heading points up.
export class Radar {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.size = canvas.width;
  }

  draw(lidar, headingDeg, safeDist) {
    const ctx = this.ctx;
    const S = this.size;
    const cx = S / 2;
    const cy = S / 2;
    const R = S / 2 - 10;
    const scale = R / lidar.maxRange;

    ctx.clearRect(0, 0, S, S);

    // Range rings
    ctx.strokeStyle = "#1d2c49";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, (R * i) / 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Cross hairs
    ctx.beginPath();
    ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R);
    ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
    ctx.stroke();

    // Safety ring
    ctx.strokeStyle = "rgba(45,212,191,0.6)";
    ctx.beginPath();
    ctx.arc(cx, cy, safeDist * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Heading indicator (always up)
    ctx.fillStyle = "#2dd4bf";
    ctx.beginPath();
    ctx.moveTo(cx, cy - R - 1);
    ctx.lineTo(cx - 5, cy - R + 9);
    ctx.lineTo(cx + 5, cy - R + 9);
    ctx.closePath();
    ctx.fill();

    // Scan points, rotated into the robot frame (forward = up = -Y on canvas).
    for (let d = 0; d < 360; d++) {
      if (!lidar.valid[d]) continue;
      const rel = ((d - headingDeg) * Math.PI) / 180;
      const dist = lidar.distances[d] * scale;
      const x = cx + Math.sin(rel) * dist;
      const y = cy - Math.cos(rel) * dist;
      const t = lidar.distances[d] / lidar.maxRange;
      ctx.fillStyle = t < 0.35 ? "#f87171" : t < 0.7 ? "#facc15" : "#34d399";
      ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    }

    // Robot at center
    ctx.fillStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}
