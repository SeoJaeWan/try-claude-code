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

/** Check URL param for forced fallback (used by E2E tests) */
function useForcedFallback() {
  const [forceFallback, setForceFallback] = useState<string | null>(null);
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("forceFallback");
    setForceFallback(param);
  }, []);
  return forceFallback;
}

export function App() {
  const sceneIndex = useStore(store, (s) => s.sceneIndex);
  const playback = useStore(store, (s) => s.playback);
  const motionMode = useStore(store, (s) => s.motionMode);
  const cameraMode = useStore(store, (s) => s.cameraMode);

  const forceFallback = useForcedFallback();
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
  const progressLabel = `${sceneIndex + 1} / ${scenes.length}`;

  const handleSelectScene = (id: string) => {
    const idx = scenes.findIndex((s) => s.id === id);
    if (idx !== -1) store.getState().goToScene(idx);
  };

  const webglFallback = forceFallback === "webgl";

  if (webglFallback) {
    return (
      <div
        style={{ display: "flex", flexDirection: "column", height: "100%" }}
      >
        <FallbackView
          reason="webgl-unavailable"
          currentSceneLabel={currentScene.title}
          progressLabel={progressLabel}
        />
      </div>
    );
  }

  const controls = (
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
  );

  const progress = (
    <ProgressStrip
      scenes={progressScenes}
      currentSceneId={currentScene.id}
      onSelectScene={handleSelectScene}
    />
  );

  const canvas = (
    <WebGLErrorBoundary>
      <FlowCanvas
        currentScene={currentScene}
        motionMode={motionMode}
        cameraMode={cameraMode}
        sceneIndex={sceneIndex}
      />
    </WebGLErrorBoundary>
  );

  return (
    <>
      {/* Desktop layout: full-bleed canvas + right panel + top controls + bottom progress */}
      <div
        className="hidden md:flex flex-col h-full overflow-hidden"
        aria-label="Codex workflow 3D 흐름 앱"
      >
        {controls}
        <div className="flex flex-1 min-h-0 relative">
          {/* 3D Canvas — full bleed */}
          <div className="flex-1 relative min-w-0">
            {canvas}
          </div>
          {/* Right inspector */}
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
        </div>
        {progress}
      </div>

      {/* Mobile layout: full-bleed canvas, compact controls, progress strip above bottom sheet */}
      <div
        className="flex md:hidden flex-col h-full overflow-hidden relative"
        aria-label="Codex workflow 3D 흐름 앱"
      >
        {controls}
        {/* Canvas fills remaining space */}
        <div className="flex-1 relative min-h-0">
          {canvas}
        </div>
        {/* Progress strip sits above the inspector sheet */}
        {progress}
        {/* Mobile bottom sheet inspector */}
        <InspectorPanel
          currentScene={currentScene}
          allScenes={scenes}
          variant="mobile"
        />
      </div>
    </>
  );
}
