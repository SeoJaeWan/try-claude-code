import { createStore } from "zustand";

import type { CameraMode, MotionMode, PlaybackState } from "@/domain/workflowTypes";

export interface WorkflowState {
  sceneIndex: number;
  playback: PlaybackState;
  motionMode: MotionMode;
  cameraMode: CameraMode;
  replayNonce: number;
  /** Total number of scenes — used for boundary checks */
  sceneCount: number;

  // Actions
  previousScene: () => void;
  nextScene: () => void;
  goToScene: (index: number) => void;
  replayScene: () => void;
  setPlayback: (playback: PlaybackState) => void;
  togglePlayback: () => void;
  setMotionMode: (mode: MotionMode) => void;
  toggleMotionMode: () => void;
  setCameraMode: (mode: CameraMode) => void;
  toggleCameraMode: () => void;
  /**
   * Called by the autoplay scheduler each tick.
   * Advances to the next scene, or pauses if already at the last scene.
   */
  autoplayTick: () => void;
}

export interface WorkflowStoreInit {
  sceneCount: number;
  prefersReducedMotion: boolean;
}

/** Factory — creates a standalone store instance (useful for unit testing). */
export function createWorkflowStore(init: WorkflowStoreInit) {
  return createStore<WorkflowState>((set, get) => ({
    sceneIndex: 0,
    playback: "paused",
    motionMode: init.prefersReducedMotion ? "reduced" : "full",
    cameraMode: "scene",
    replayNonce: 0,
    sceneCount: init.sceneCount,

    previousScene() {
      set((s) => ({
        sceneIndex: Math.max(0, s.sceneIndex - 1),
      }));
    },

    nextScene() {
      set((s) => ({
        sceneIndex: Math.min(s.sceneCount - 1, s.sceneIndex + 1),
      }));
    },

    goToScene(index) {
      const { sceneCount } = get();
      set({ sceneIndex: Math.min(sceneCount - 1, Math.max(0, index)) });
    },

    replayScene() {
      set((s) => ({ replayNonce: s.replayNonce + 1 }));
    },

    setPlayback(playback) {
      set({ playback });
    },

    togglePlayback() {
      set((s) => ({ playback: s.playback === "playing" ? "paused" : "playing" }));
    },

    setMotionMode(motionMode) {
      set({ motionMode });
    },

    toggleMotionMode() {
      set((s) => ({ motionMode: s.motionMode === "full" ? "reduced" : "full" }));
    },

    setCameraMode(cameraMode) {
      set({ cameraMode });
    },

    toggleCameraMode() {
      set((s) => ({ cameraMode: s.cameraMode === "scene" ? "whole-map" : "scene" }));
    },

    autoplayTick() {
      const { sceneIndex, sceneCount } = get();
      if (sceneIndex >= sceneCount - 1) {
        // Already at last scene — pause, don't advance past boundary
        set({ playback: "paused" });
      } else {
        set({ sceneIndex: sceneIndex + 1 });
      }
    },
  }));
}

/** Singleton store for the app. Reads prefers-reduced-motion from the browser. */
let _appStore: ReturnType<typeof createWorkflowStore> | null = null;

export function getAppStore(sceneCount: number): ReturnType<typeof createWorkflowStore> {
  if (!_appStore) {
    const prefersReducedMotion =
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;
    _appStore = createWorkflowStore({ sceneCount, prefersReducedMotion });
  }
  return _appStore;
}
