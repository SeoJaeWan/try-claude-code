import { useEffect, useRef, useState } from "react";
import { useStore } from "zustand";

import { workflowScenario } from "@/domain/workflowScenario";
import { getAppStore } from "@/state/workflowStore";

import { FallbackView } from "./components/FallbackView";
import { FlowCanvas } from "./components/FlowCanvas";
import { InspectorPanel } from "./components/InspectorPanel";
import { ProgressStrip } from "./components/ProgressStrip";
import { TopControls } from "./components/TopControls";

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

  const { previousScene, nextScene, replayScene, togglePlayback, toggleWholeMap, toggleMotionMode } = {
    previousScene: store.getState().previousScene,
    nextScene: store.getState().nextScene,
    replayScene: store.getState().replayScene,
    togglePlayback: store.getState().togglePlayback,
    toggleWholeMap: store.getState().toggleCameraMode,
    toggleMotionMode: store.getState().toggleMotionMode,
  };

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

  const webglFallback = forceFallback === "webgl";

  if (webglFallback) {
    return (
      <div className="flex flex-col h-full">
        <FallbackView
          reason="webgl-unavailable"
          currentSceneLabel={currentScene.title}
          progressLabel={progressLabel}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top controls bar */}
      <TopControls
        playback={playback}
        cameraMode={cameraMode}
        motionMode={motionMode}
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
        onPrevious={previousScene}
        onNext={nextScene}
        onReplay={replayScene}
        onTogglePlayback={togglePlayback}
        onToggleWholeMap={toggleWholeMap}
        onToggleMotionMode={toggleMotionMode}
      />

      {/* Main content area */}
      <div className="flex flex-1 min-h-0 relative">
        {/* 3D Canvas — always full-bleed */}
        <div className="flex-1 relative min-w-0">
          <FlowCanvas
            currentScene={currentScene}
            motionMode={motionMode}
            cameraMode={cameraMode}
            sceneIndex={sceneIndex}
          />
        </div>

        {/* Desktop: right inspector panel */}
        <div className="hidden md:flex md:w-80 lg:w-96 flex-col border-l border-white/8 overflow-hidden">
          <InspectorPanel
            currentScene={currentScene}
            allScenes={scenes}
            variant="desktop"
          />
        </div>
      </div>

      {/* Bottom progress strip */}
      <ProgressStrip
        scenes={progressScenes}
        currentSceneId={currentScene.id}
        onSelectScene={(id) => {
          const idx = scenes.findIndex((s) => s.id === id);
          if (idx !== -1) store.getState().goToScene(idx);
        }}
      />

      {/* Mobile: bottom sheet inspector */}
      <div
        className="md:hidden absolute bottom-0 left-0 right-0"
        style={{ paddingBottom: "var(--progress-strip-height, 52px)" }}
      >
        <InspectorPanel
          currentScene={currentScene}
          allScenes={scenes}
          variant="mobile"
        />
      </div>
    </div>
  );
}
