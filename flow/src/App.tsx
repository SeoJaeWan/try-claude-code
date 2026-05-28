import { useEffect, useRef, useState } from "react";
import { useStore } from "zustand";

import { workflowScenario } from "@/domain/workflowScenario";
import { getAppStore } from "@/state/workflowStore";

import { FallbackView } from "./components/FallbackView";
import { FlowCanvas } from "./components/FlowCanvas";
import { InspectorPanel } from "./components/InspectorPanel";
import { ProgressStrip } from "./components/ProgressStrip";
import { TopControls } from "./components/TopControls";
import { WebGLErrorBoundary } from "./components/WebGLErrorBoundary";

const AUTOPLAY_INTERVAL_MS = 6000;

const scenes = workflowScenario.scenes;
const store = getAppStore(scenes.length);

/** Check URL param for forced fallback (used by E2E tests) — read synchronously on first render */
function useForcedFallback() {
  const [forceFallback] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("forceFallback");
  });
  return forceFallback;
}

/** Detect mobile breakpoint reactively */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

export function App() {
  const sceneIndex = useStore(store, (s) => s.sceneIndex);
  const playback = useStore(store, (s) => s.playback);
  const motionMode = useStore(store, (s) => s.motionMode);
  const cameraMode = useStore(store, (s) => s.cameraMode);

  const forceFallback = useForcedFallback();
  const isMobile = useIsMobile();
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Autoplay scheduler
  useEffect(() => {
    if (playback === "playing") {
      autoplayRef.current = setInterval(() => {
        store.getState().autoplayTick();
      }, AUTOPLAY_INTERVAL_MS);
    } else {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    }
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [playback]);

  const currentScene = scenes[sceneIndex]!;
  const canGoPrevious = sceneIndex > 0;
  const canGoNext = sceneIndex < scenes.length - 1;

  const progressScenes = scenes.map((s) => ({ id: s.id, label: s.title }));
  // progressLabel used by fallback path (not currently active)
  // const progressLabel = `${sceneIndex + 1} / ${scenes.length}`;

  const handleSelectScene = (id: string) => {
    const idx = scenes.findIndex((s) => s.id === id);
    if (idx !== -1) store.getState().goToScene(idx);
  };

  const webglFallback = forceFallback === "webgl";

  if (webglFallback) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <FallbackView reason="webgl-unavailable" />
      </div>
    );
  }

  return (
    <div
      style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}
    >
      {/* Top controls */}
      <TopControls
        playback={playback}
        cameraMode={cameraMode}
        motionMode={motionMode}
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
        onPrevious={() => store.getState().previousScene()}
        onNext={() => store.getState().nextScene()}
        onReplay={() => store.getState().replayScene()}
        onTogglePlayback={() => store.getState().togglePlayback()}
        onToggleWholeMap={() => store.getState().toggleCameraMode()}
        onToggleMotionMode={() => store.getState().toggleMotionMode()}
      />

      {/* Content: canvas + inspector */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, position: "relative" }}>
        {/* Canvas fills the left area */}
        <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
          <WebGLErrorBoundary>
            <FlowCanvas
              currentScene={currentScene}
              motionMode={motionMode}
              cameraMode={cameraMode}
              sceneIndex={sceneIndex}
            />
          </WebGLErrorBoundary>
        </div>

        {/* Desktop right inspector panel — hidden on mobile via inline style */}
        {!isMobile && (
          <div
            style={{
              width: "320px",
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              overflow: "hidden",
            }}
          >
            <InspectorPanel
              currentScene={currentScene}
              allScenes={scenes}
              variant="desktop"
            />
          </div>
        )}
      </div>

      {/* Progress strip */}
      <ProgressStrip
        scenes={progressScenes}
        currentSceneId={currentScene.id}
        onSelectScene={handleSelectScene}
      />

      {/* Mobile bottom sheet inspector — only rendered on mobile */}
      {isMobile && (
        <InspectorPanel
          currentScene={currentScene}
          allScenes={scenes}
          variant="mobile"
        />
      )}
    </div>
  );
}
