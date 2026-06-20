// Renderer backend selection + WebGPU capability detection.
//
// The app currently runs on the classic WebGL renderer (three's WebGLRenderer),
// which is what the bloom/vignette post-processing, reflective floor, and
// contact shadows depend on. WebGPU support is scaffolded but gated behind
// WEBGPU_ENABLED until those effects are ported to three's TSL/node pipeline.
//
// Why a flag and not just a renderer swap: three ships two mutually exclusive
// builds. `three` (main) has WebGLRenderer (needed by our GLSL effects);
// `three/webgpu` has WebGPURenderer but not WebGLRenderer, and is a separate
// copy of the core. They can't both drive this scene in one bundle, so turning
// WebGPU on is a deliberate, separate step.
export const WEBGPU_ENABLED = false;

// True if the browser can actually give us a WebGPU adapter.
export async function detectWebGPU() {
  if (typeof navigator === "undefined" || !navigator.gpu) return false;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

// Decide which backend actually runs, given the user's mode + capability.
// Falls back to WebGL whenever WebGPU is disabled, unwanted, or unavailable.
export function chooseBackend(mode, webgpuAvailable) {
  const wantWebGPU = mode === "webgpu" || mode === "auto";
  if (WEBGPU_ENABLED && wantWebGPU && webgpuAvailable) return "webgpu";
  return "webgl";
}

// Human-readable status for the renderer panel.
export function rendererStatus(mode, webgpuAvailable, activeBackend) {
  if (activeBackend === "webgpu") return "WebGPU active";
  const wantWebGPU = mode === "webgpu" || mode === "auto";
  if (!wantWebGPU) return "compatibility mode";
  if (webgpuAvailable === null) return "detecting…";
  if (!webgpuAvailable) return "WebGPU unavailable on this device";
  if (!WEBGPU_ENABLED) return "WebGPU detected — enable coming soon";
  return "ready";
}

// Future hook: R3F `gl` factory for WebGPU (async device init). Unused until
// WEBGPU_ENABLED is true and the effects are ported. Kept here so flipping the
// flag is the only change needed to start wiring it up.
export async function createWebGPURenderer(props) {
  const { WebGPURenderer } = await import("three/webgpu");
  const renderer = new WebGPURenderer({ ...props, antialias: true });
  await renderer.init();
  return renderer;
}
