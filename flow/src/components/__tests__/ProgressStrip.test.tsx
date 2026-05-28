import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProgressStrip } from "../ProgressStrip";

const scenes = [
  { id: "S01-request-enters-brainstorm", label: "요청" },
  { id: "S04-plan-tdd-blocks-maker", label: "plan-tdd block" },
  { id: "S10-dev-review-rework-qa", label: "dev-review rework" },
  { id: "S12-final-main-merge", label: "main merge" },
];

describe("ProgressStrip 장면 진행 막대", () => {
  it("현재 장면을 전달하면 progress가 screen reader에 현재 위치를 알린다", () => {
    render(<ProgressStrip scenes={scenes} currentSceneId="S10-dev-review-rework-qa" onSelectScene={vi.fn()} />);

    expect(screen.getByRole("navigation", { name: "workflow 장면 진행" })).toBeVisible();
    expect(screen.getByRole("button", { name: "현재 장면: dev-review rework" })).toHaveAttribute(
      "aria-current",
      "step",
    );
  });

  it("사용자가 진행 막대를 누르면 해당 scene id가 선택되고 업무 rework arc로 표시되지 않는다", () => {
    const onSelectScene = vi.fn();
    render(<ProgressStrip scenes={scenes} currentSceneId="S01-request-enters-brainstorm" onSelectScene={onSelectScene} />);

    fireEvent.click(screen.getByRole("button", { name: "main merge" }));

    expect(onSelectScene).toHaveBeenCalledWith("S12-final-main-merge");
    expect(screen.getByRole("button", { name: "main merge" })).toHaveAttribute("data-navigation-control", "true");
    expect(screen.getByRole("button", { name: "main merge" })).not.toHaveAttribute("data-return-arc");
  });
});
