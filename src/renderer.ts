// Renderer backend selection + WebGPU capability detection.
//
// The app runs on the classic WebGL renderer (needed by the bloom/vignette
// post-processing, reflective floor, and contact shadows). WebGPU support is
// scaffolded but gated behind WEBGPU_ENABLED until those effects are ported to
// three's TSL/node pipeline. See README for the two-build constraint.
export const WEBGPU_ENABLED = false;

export type RendererMode = "auto" | "webgpu" | "webgl";
export type Backend = "webgl" | "webgpu";

export async function detectWebGPU(): Promise<boolean> {
  const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  if (!gpu) return false;
  try {
    return !!(await gpu.requestAdapter());
  } catch {
    return false;
  }
}

export function chooseBackend(mode: RendererMode, webgpuAvailable: boolean | null): Backend {
  const wantWebGPU = mode === "webgpu" || mode === "auto";
  if (WEBGPU_ENABLED && wantWebGPU && !!webgpuAvailable) return "webgpu";
  return "webgl";
}

// Future hook: R3F `gl` factory for WebGPU (async device init). Unused until
// WEBGPU_ENABLED is true and the effects are ported.
export async function createWebGPURenderer(props: Record<string, unknown>) {
  const mod = await import("three/webgpu");
  const renderer = new mod.WebGPURenderer({ ...(props as object), antialias: true } as never);
  await renderer.init();
  return renderer;
}
