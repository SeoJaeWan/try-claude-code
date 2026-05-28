import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TopControls } from "../TopControls";

function renderControls(overrides = {}) {
  const actions = {
    onPrevious: vi.fn(),
    onNext: vi.fn(),
    onReplay: vi.fn(),
    onTogglePlayback: vi.fn(),
    onToggleWholeMap: vi.fn(),
    onToggleMotionMode: vi.fn(),
  };
  render(
    <TopControls
      playback="paused"
      cameraMode="scene"
      motionMode="full"
      canGoPrevious
      canGoNext
      {...actions}
      {...overrides}
    />,
  );
  return actions;
}

describe("TopControls 사용자 제어", () => {
  it("사용자가 icon button을 누르면 이전/다음/replay/autoplay/whole-map/reduced-motion trigger가 호출된다", () => {
    const actions = renderControls();

    fireEvent.click(screen.getByRole("button", { name: "이전 장면" }));
    fireEvent.click(screen.getByRole("button", { name: "다음 장면" }));
    fireEvent.click(screen.getByRole("button", { name: "현재 장면 다시 재생" }));
    fireEvent.click(screen.getByRole("button", { name: "자동 재생 시작" }));
    fireEvent.click(screen.getByRole("button", { name: "전체 지도 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "움직임 줄이기" }));

    expect(actions.onPrevious).toHaveBeenCalledTimes(1);
    expect(actions.onNext).toHaveBeenCalledTimes(1);
    expect(actions.onReplay).toHaveBeenCalledTimes(1);
    expect(actions.onTogglePlayback).toHaveBeenCalledTimes(1);
    expect(actions.onToggleWholeMap).toHaveBeenCalledTimes(1);
    expect(actions.onToggleMotionMode).toHaveBeenCalledTimes(1);
  });

  it("처음과 끝 장면 상태를 받으면 범위를 벗어나는 navigation 버튼이 비활성화된다", () => {
    renderControls({ canGoPrevious: false, canGoNext: false });

    expect(screen.getByRole("button", { name: "이전 장면" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "다음 장면" })).toBeDisabled();
  });

  it("각 icon button은 aria-label과 tooltip을 가져서 canvas만으로 정보가 닫히지 않는다", () => {
    renderControls();

    for (const label of [
      "이전 장면",
      "다음 장면",
      "현재 장면 다시 재생",
      "자동 재생 시작",
      "전체 지도 보기",
      "움직임 줄이기",
    ]) {
      expect(screen.getByRole("button", { name: label })).toHaveAttribute("title", label);
    }
  });
});
