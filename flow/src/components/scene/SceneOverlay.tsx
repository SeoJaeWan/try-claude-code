/**
 * Semantic DOM overlay that mirrors scene state for E2E test observability and screen readers.
 * Elements are positioned as a 1px invisible layer — they are visible to Playwright but
 * do not affect visual output. The 3D canvas renders the real visual scene.
 */
import type { CameraMode, MotionMode, WorkflowScene } from "@/domain/workflowTypes";

interface SceneOverlayProps {
  currentScene: WorkflowScene;
  motionMode: MotionMode;
  cameraMode: CameraMode;
}

const markerStyle: React.CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  left: 0,
  top: 0,
  pointerEvents: "none",
  userSelect: "none",
  overflow: "hidden",
};

export function SceneOverlay({ currentScene, motionMode, cameraMode }: SceneOverlayProps) {
  const { connectors = [], commits = [], review, merge, packets = [] } = currentScene;

  const blockReturnConnectors = connectors.filter((c) => c.kind === "block-return" || c.kind === "rework-return");
  const hasPackets = packets.length > 0;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      {/* Current scene identity */}
      <div data-testid={`scene-${currentScene.id}`} style={markerStyle} />

      {/* Motion/camera mode indicators */}
      <div data-motion-mode={motionMode} data-camera-mode={cameraMode} style={markerStyle} />

      {/* Return arcs — block and rework */}
      {blockReturnConnectors.map((c) => (
        <div
          key={c.id}
          data-testid={`return-arc-${c.id}`}
          data-kind={c.kind}
          style={markerStyle}
        />
      ))}

      {/* Workflow packets — motion behavior */}
      {hasPackets && (
        <div
          data-testid="workflow-packet"
          data-motion-behavior={motionMode === "reduced" ? "endpoint-snap" : "animated"}
          style={markerStyle}
        />
      )}

      {/* Commit card stack */}
      {commits.length > 0 && (
        <div data-testid="commit-card-stack" style={{ ...markerStyle, overflow: "visible" }}>
          {commits.map((c) => (
            <span key={c.id} data-phase={c.phase}>phase {c.phase} </span>
          ))}
        </div>
      )}

      {/* Review feedback return arc */}
      {review?.feedbackReturnArc && (
        <div data-testid="review-feedback-return" style={markerStyle} />
      )}

      {/* Main end state */}
      {merge && (
        <div
          data-testid="main-end-state"
          data-complete={merge.complete ? "true" : "false"}
          data-choice={merge.selectedChoice}
          style={markerStyle}
        />
      )}
    </div>
  );
}
