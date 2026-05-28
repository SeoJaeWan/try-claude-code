import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InspectorPanel } from "../InspectorPanel";

const scenes = [
  {
    id: "S04-plan-tdd-blocks-maker",
    title: "plan-tdd block",
    summary: "테스트 경계를 막고 plan-maker로 돌려보낸다.",
    dialogue: [
      { id: "user-1", speaker: "user", text: "이 3D 흐름 앱을 flow/에 만들어 달라." },
      { id: "codex-1", speaker: "codex", text: "plan-tdd가 테스트 경계를 block했습니다." },
      { id: "reviewer-1", speaker: "reviewer", text: "경계가 부족해 수정이 필요합니다." },
    ],
    loopReason: "plan-tdd에서 plan-maker로 돌아가는 업무 반환",
  },
  {
    id: "S12-final-main-merge",
    title: "main merge",
    summary: "task branch가 main에 merge되어 끝난다.",
    dialogue: [
      { id: "codex-final", speaker: "codex", text: "final merge가 완료되었습니다." },
    ],
  },
];

describe("InspectorPanel 설명과 대화", () => {
  it("현재 장면을 전달하면 해당 user/Codex/reviewer bubble과 block 사유만 표시된다", () => {
    render(<InspectorPanel currentScene={scenes[0]} allScenes={scenes} variant="desktop" />);

    const panel = screen.getByRole("complementary", { name: "현재 workflow 설명" });
    expect(within(panel).getByText("테스트 경계를 막고 plan-maker로 돌려보낸다.")).toBeVisible();
    expect(within(panel).getByText("이 3D 흐름 앱을 flow/에 만들어 달라.")).toBeVisible();
    expect(within(panel).getByText("plan-tdd가 테스트 경계를 block했습니다.")).toBeVisible();
    expect(within(panel).getByText("경계가 부족해 수정이 필요합니다.")).toBeVisible();
    expect(within(panel).getByText("plan-tdd에서 plan-maker로 돌아가는 업무 반환")).toBeVisible();
    expect(within(panel).queryByText("final merge가 완료되었습니다.")).not.toBeInTheDocument();
  });

  it("merge 선택 장면을 전달하면 PR/later가 아니라 merge 선택과 최종 main merge를 설명한다", () => {
    render(
      <InspectorPanel
        currentScene={{
          id: "S11-user-merge-decision",
          title: "merge decision",
          summary: "사용자가 merge를 선택한다.",
          decision: { selected: "merge", rejected: ["pr", "later"] },
          dialogue: [{ id: "user-merge", speaker: "user", text: "merge로 진행합니다." }],
        }}
        allScenes={scenes}
        variant="desktop"
      />,
    );

    expect(screen.getByText("merge로 진행합니다.")).toBeVisible();
    expect(screen.getByText("사용자가 merge를 선택한다.")).toBeVisible();
    expect(screen.queryByText(/PR로 진행/)).not.toBeInTheDocument();
    expect(screen.queryByText(/나중에 진행/)).not.toBeInTheDocument();
  });
});
