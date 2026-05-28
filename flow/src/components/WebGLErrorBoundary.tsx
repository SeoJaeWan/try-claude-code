import { Component, type ReactNode } from "react";

import { FallbackView } from "./FallbackView";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class WebGLErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error) {
    // Log for debugging without exposing to user
    console.warn("[WebGLErrorBoundary]", error.message);
  }

  override render() {
    if (this.state.hasError) {
      return <FallbackView reason="webgl-unavailable" />;
    }
    return this.props.children;
  }
}
