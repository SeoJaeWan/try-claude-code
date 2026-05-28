import { describe, expect, it } from "vitest";

import { assetRegistry } from "../assets/assetRegistry";
import { workflowScenario } from "./workflowScenario";

const requiredSceneIds = [
  "S01-request-enters-brainstorm",
  "S02-ui-spec-locks-direction",
  "S03-orchestrator-starts-planning",
  "S04-plan-tdd-blocks-maker",
  "S05-plan-review-blocks-maker",
  "S06-docs-needs-change",
  "S07-docs-reapproved",
  "S08-runner-creates-worktree",
  "S09-phase-commits-accumulate",
  "S10-dev-review-rework-qa",
  "S11-user-merge-decision",
  "S12-final-main-merge",
];

function scene(id: string) {
  const found = workflowScenario.scenes.find((candidate) => candidate.id === id);
  expect(found, `${id} 장면이 정적 시나리오에 있어야 한다`).toBeDefined();
  return found!;
}

describe("workflowScenario 정적 예시 데이터", () => {
  it("앱을 시작하면 사용자 요청부터 main merge까지 12개 장면이 고정 순서로 나온다", () => {
    expect(workflowScenario.request.text).toContain("flow/");
    expect(workflowScenario.scenes.map((item) => item.id)).toEqual(requiredSceneIds);
    expect(workflowScenario.scenes).toHaveLength(12);
  });

  it("각 장면을 읽으면 node, connector, dialogue, 문서, commit, review, merge event가 안정 id로 나온다", () => {
    expect(scene("S01-request-enters-brainstorm").dialogue).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ speaker: "user", text: expect.stringContaining("3D") }),
        expect.objectContaining({ speaker: "codex", text: expect.stringContaining("brainstorm") }),
      ]),
    );

    expect(scene("S03-orchestrator-starts-planning").nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "orchestrator", role: "hub" }),
        expect.objectContaining({ id: "plan-maker" }),
        expect.objectContaining({ id: "plan-tdd" }),
        expect.objectContaining({ id: "plan-review" }),
      ]),
    );

    expect(scene("S07-docs-reapproved").documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "planning-docs", version: "v2", approval: "approved" }),
        expect.objectContaining({ id: "tdd", freshness: "fresh", status: "pass" }),
        expect.objectContaining({ id: "review", freshness: "fresh", status: "pass" }),
      ]),
    );

    expect(scene("S09-phase-commits-accumulate").commits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "phase-1-commit", phase: 1 }),
        expect.objectContaining({ id: "phase-2-commit", phase: 2 }),
        expect.objectContaining({ id: "phase-3-commit", phase: 3 }),
      ]),
    );

    expect(scene("S10-dev-review-rework-qa").review).toEqual(
      expect.objectContaining({ feedbackReturnArc: true, reworkCommit: true, qaConfirmed: true }),
    );

    expect(scene("S12-final-main-merge").merge).toEqual(
      expect.objectContaining({ target: "main", selectedChoice: "merge", complete: true }),
    );
  });

  it("planning block 장면을 읽으면 사용자 이전/다음이 아니라 업무 반환 arc로 구분된다", () => {
    expect(scene("S04-plan-tdd-blocks-maker").connectors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "plan-tdd-to-plan-maker-block",
          kind: "block-return",
          from: "plan-tdd",
          to: "plan-maker",
          userNavigation: false,
        }),
      ]),
    );

    expect(scene("S05-plan-review-blocks-maker").connectors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "plan-review-to-plan-maker-block",
          kind: "block-return",
          from: "plan-review",
          to: "plan-maker",
          userNavigation: false,
        }),
      ]),
    );
  });

  it("scenario data를 가져와도 실제 planning/runtime artifact나 git을 읽는 source가 없다", () => {
    expect(workflowScenario.externalSources).toEqual([]);
    for (const item of workflowScenario.scenes) {
      expect(item).not.toHaveProperty("sourcePath");
      expect(item).not.toHaveProperty("artifactPath");
      expect(item).not.toHaveProperty("gitCommand");
      expect(item).not.toHaveProperty("fetchUrl");
    }
  });

  it("assetRegistry를 읽으면 네 개의 권위 asset 경로와 쓰임새가 나온다", () => {
    expect(assetRegistry.cover).toMatchObject({
      src: "/assets/workflow-cover.png",
      role: "loading-poster",
    });
    expect(assetRegistry.fallbackPoster).toMatchObject({
      src: "/assets/fallback-flow-poster.png",
      role: "webgl-fallback",
    });
    expect(assetRegistry.darkCanvasTexture).toMatchObject({
      src: "/assets/dark-canvas-texture.png",
      role: "canvas-background-material",
    });
    expect(assetRegistry.surfaceTexture).toMatchObject({
      src: "/assets/surface-texture.png",
      role: "node-document-commit-material",
    });
  });
});
