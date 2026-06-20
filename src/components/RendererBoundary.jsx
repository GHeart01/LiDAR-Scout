import { Component } from "react";

// Catches render/commit errors from the canvas subtree. If a WebGPU canvas
// fails to initialise, it triggers the fallback to WebGL. (Errors thrown inside
// the useFrame loop aren't caught by React boundaries, but init/commit ones are.)
export default class RendererBoundary extends Component {
  state = { errored: false };

  static getDerivedStateFromError() {
    return { errored: true };
  }

  componentDidCatch(error) {
    if (this.props.backend === "webgpu") {
      console.warn("WebGPU renderer failed, falling back to WebGL:", error);
      this.props.onError?.();
    } else {
      console.error("Renderer error:", error);
    }
  }

  render() {
    if (this.state.errored) {
      return <div className="renderer-loading">Renderer error — recovering…</div>;
    }
    return this.props.children;
  }
}
