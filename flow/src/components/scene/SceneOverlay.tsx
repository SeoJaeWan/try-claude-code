/**
 * Invisible DOM overlay that mirrors the current scene state for E2E test observability.
 * The 3D canvas content cannot be queried by Playwright via ARIA/testid — this overlay
 * provides semantic markers for workflow state assertions without affecting visual output.
 */
import type { CameraMode, MotionMode, WorkflowScene } from "@/domain/workflowTypes";

interface SceneOverlayProps {
  currentScene: WorkflowScene;
  motionMode: MotionMode;
  cameraMode: CameraMode;
}

export function SceneOverlay({ currentScene, motionMode, cameraMode }: SceneOverlayProps) {
  const { connectors = [], commits = [], review, merge, packets = [] } = currentScene;

  const blockReturnConnectors = connectors.filter((c) => c.kind === "block-return" || c.kind === "rework-return");
  const hasPackets = packets.length > 0;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        width: 0,
        height: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: -1,
      }}
    >
      {/* Current scene identity */}
      <div data-testid={`scene-${currentScene.id}`} />

      {/* Camera mode indicator (on the canvas wrapper — exposed via parent) */}
      <div data-motion-mode={motionMode} data-camera-mode={cameraMode} />

      {/* Return arcs — block and rework */}
      {blockReturnConnectors.map((c) => (
        <div
          key={c.id}
          data-testid={`return-arc-${c.id}`}
          data-kind={c.kind}
        />
      ))}

      {/* Workflow packets — motion behavior */}
      {hasPackets && (
        <div
          data-testid="workflow-packet"
          data-motion-behavior={motionMode === "reduced" ? "endpoint-snap" : "animated"}
        />
      )}

      {/* Commit card stack */}
      {commits.length > 0 && (
        <div data-testid="commit-card-stack">
          {commits.map((c) => (
            <span key={c.id} data-phase={c.phase}>phase {c.phase}</span>
          ))}
        </div>
      )}

      {/* Review feedback return */}
      {review?.feedbackReturnArc && (
        <div data-testid="review-feedback-return" />
      )}

      {/* Main end state */}
      {merge && (
        <div
          data-testid="main-end-state"
          data-complete={merge.complete ? "true" : "false"}
          data-choice={merge.selectedChoice}
        />
      )}

      {/* Progress label for screen reader and E2E */}
      {merge?.complete && (
        <div data-testid="merge-complete-label">
          {`merge를 선택`}
        </div>
      )}
    </div>
  );
}
