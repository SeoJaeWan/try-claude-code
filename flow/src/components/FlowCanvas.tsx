import type { CameraMode, MotionMode } from "@/domain/workflowTypes";
import type { WorkflowScene } from "@/domain/workflowTypes";

interface FlowCanvasProps {
  currentScene: WorkflowScene;
  motionMode: MotionMode;
  cameraMode: CameraMode;
  sceneIndex: number;
}

/**
 * Phase 4 stub — renders a placeholder canvas that satisfies responsive shell layout.
 * Full 3D implementation is in Phase 5.
 */
export function FlowCanvas(_props: FlowCanvasProps) {
  return (
    <div
      data-testid="workflow-canvas"
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--color-bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
        3D canvas — Phase 5 에서 구현됩니다
      </p>
    </div>
  );
}
