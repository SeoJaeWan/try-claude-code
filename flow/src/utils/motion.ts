import type { MotionMode } from "@/domain/workflowTypes";

/** Duration values (ms) scaled by motion mode */
export const MOTION_DURATIONS = {
  full: {
    packetTravel: 1200,
    cameraOrbit: 2000,
    sceneTransition: 600,
    fade: 300,
  },
  reduced: {
    packetTravel: 0,
    cameraOrbit: 0,
    sceneTransition: 150,
    fade: 120,
  },
} as const satisfies Record<MotionMode, Record<string, number>>;

/** Easing functions by motion mode */
export const MOTION_EASING = {
  full: "cubic-bezier(0.4, 0, 0.2, 1)",
  reduced: "linear",
} as const satisfies Record<MotionMode, string>;

/**
 * Returns the duration (ms) for a given animation type based on current motion mode.
 * Always returns 0 for reduced motion on long animations.
 */
export function getDuration(
  type: keyof (typeof MOTION_DURATIONS)[MotionMode],
  mode: MotionMode,
): number {
  return MOTION_DURATIONS[mode][type];
}

/**
 * Maps a normalised t [0..1] to a packet position along a connector.
 * In reduced motion, snaps immediately to the endpoint (t=1).
 */
export function packetPosition(t: number, mode: MotionMode): number {
  if (mode === "reduced") return 1;
  return Math.min(1, Math.max(0, t));
}

/**
 * Returns the CSS transition string for scene shell elements.
 * Reduced motion uses instant/minimal transitions.
 */
export function shellTransition(mode: MotionMode): string {
  const d = MOTION_DURATIONS[mode].sceneTransition;
  const e = MOTION_EASING[mode];
  return `opacity ${d}ms ${e}, transform ${d}ms ${e}`;
}
