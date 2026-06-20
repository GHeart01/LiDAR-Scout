import { useStore } from "../store.js";
import { rendererStatus } from "../renderer.js";

const MODES = [
  ["auto", "Auto"],
  ["webgpu", "WebGPU"],
  ["webgl", "WebGL"],
];

export default function RendererPanel() {
  const rendererMode = useStore((s) => s.rendererMode);
  const setRendererMode = useStore((s) => s.setRendererMode);
  const webgpuAvailable = useStore((s) => s.webgpuAvailable);
  const activeBackend = useStore((s) => s.activeBackend);

  const status = rendererStatus(rendererMode, webgpuAvailable, activeBackend);

  return (
    <div className="panel">
      <h2>Renderer</h2>
      <div className="seg">
        {MODES.map(([m, label]) => (
          <button
            key={m}
            className={"seg-btn" + (rendererMode === m ? " active" : "")}
            onClick={() => setRendererMode(m)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="renderer-status">
        Active: <b>{activeBackend === "webgpu" ? "WebGPU" : "WebGL"}</b>
        <span> · {status}</span>
      </p>
    </div>
  );
}
