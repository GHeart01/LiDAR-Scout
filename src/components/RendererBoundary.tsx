import { Component, type ReactNode } from "react";
import type { Backend } from "../renderer";

interface Props {
  backend: Backend;
  onError?: () => void;
  children: ReactNode;
}

interface State {
  errored: boolean;
}

// Falls back to WebGL if a WebGPU canvas fails on init/commit.
export default class RendererBoundary extends Component<Props, State> {
  state: State = { errored: false };

  static getDerivedStateFromError(): State {
    return { errored: true };
  }

  componentDidCatch(error: unknown) {
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
