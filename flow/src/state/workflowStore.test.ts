import { beforeEach, describe, expect, it, vi } from "vitest";

import { createWorkflowStore } from "./workflowStore";

describe("workflowStore 장면 진행 상태", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("첫 장면과 마지막 장면에서 이전/다음을 실행하면 sceneIndex가 범위 밖으로 나가지 않는다", () => {
    const store = createWorkflowStore({ sceneCount: 12, prefersReducedMotion: false });

    store.getState().previousScene();
    expect(store.getState().sceneIndex).toBe(0);

    store.getState().goToScene(11);
    store.getState().nextScene();
    expect(store.getState().sceneIndex).toBe(11);
  });

  it("현재 장면을 다시 재생하면 sceneIndex와 playback은 유지되고 replayNonce만 증가한다", () => {
    const store = createWorkflowStore({ sceneCount: 12, prefersReducedMotion: false });
    store.getState().goToScene(4);
    store.getState().setPlayback("playing");
    const before = store.getState().replayNonce;

    store.getState().replayScene();

    expect(store.getState().sceneIndex).toBe(4);
    expect(store.getState().playback).toBe("playing");
    expect(store.getState().replayNonce).toBe(before + 1);
  });

  it("전체 지도 보기를 전환하면 cameraMode만 바뀌고 narrative state는 바뀌지 않는다", () => {
    const store = createWorkflowStore({ sceneCount: 12, prefersReducedMotion: false });
    store.getState().goToScene(6);

    store.getState().setCameraMode("whole-map");

    expect(store.getState().cameraMode).toBe("whole-map");
    expect(store.getState().sceneIndex).toBe(6);
    expect(store.getState().playback).toBe("paused");
  });

  it("마지막 장면에서 autoplay tick이 실행되면 index를 유지하고 playback이 paused가 된다", () => {
    const store = createWorkflowStore({ sceneCount: 12, prefersReducedMotion: false });
    store.getState().goToScene(11);
    store.getState().setPlayback("playing");

    store.getState().autoplayTick();

    expect(store.getState().sceneIndex).toBe(11);
    expect(store.getState().playback).toBe("paused");
  });

  it("prefers-reduced-motion이 true이면 초기 motionMode가 reduced이고 사용자가 full로 바꿀 수 있다", () => {
    const store = createWorkflowStore({ sceneCount: 12, prefersReducedMotion: true });

    expect(store.getState().motionMode).toBe("reduced");

    store.getState().setMotionMode("full");

    expect(store.getState().motionMode).toBe("full");
  });
});
