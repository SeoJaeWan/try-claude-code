import type { WorkflowScenario } from "./workflowTypes";

/**
 * Static example data representing the full workflow from brainstorm to main merge.
 * No real file-system, git, or plugin runtime sources are accessed — all data is fixed.
 */
export const workflowScenario: WorkflowScenario = {
  request: {
    text: 'Codex workflow 3D 흐름 앱을 flow/에 만들어 달라',
  },
  externalSources: [],
  scenes: [
    {
      id: "S01-request-enters-brainstorm",
      title: "사용자 요청 → brainstorm",
      summary: "사용자가 요청을 보내고 Codex brainstorm이 방향을 탐색한다.",
      dialogue: [
        {
          id: "user-s01-1",
          speaker: "user",
          text: "이 3D 흐름 앱을 flow/에 만들어 달라.",
        },
        {
          id: "codex-s01-2",
          speaker: "codex",
          text: "brainstorm을 시작합니다. 3D node graph 방향을 탐색하겠습니다.",
        },
      ],
      nodes: [
        { id: "user-request", label: "사용자 요청", role: "tool", status: "completed" },
        { id: "brainstorm", label: "brainstorm", role: "agent", status: "active" },
      ],
      connectors: [
        {
          id: "request-to-brainstorm",
          kind: "forward",
          from: "user-request",
          to: "brainstorm",
          userNavigation: false,
        },
      ],
      packets: [
        { id: "request-packet-s01", fromNode: "user-request", toNode: "brainstorm" },
      ],
    },
    {
      id: "S02-ui-spec-locks-direction",
      title: "ui-spec 방향 고정",
      summary: "ui-spec이 3D node graph 방향을 고정하고 문서 slab v1을 만든다.",
      dialogue: [
        {
          id: "codex-s02-1",
          speaker: "codex",
          text: "ui-spec이 3D restrained node graph 방향을 고정했습니다.",
        },
      ],
      nodes: [
        { id: "brainstorm", label: "brainstorm", role: "agent", status: "completed" },
        { id: "ui-spec", label: "ui-spec", role: "agent", status: "active" },
      ],
      connectors: [
        {
          id: "brainstorm-to-ui-spec",
          kind: "forward",
          from: "brainstorm",
          to: "ui-spec",
          userNavigation: false,
        },
      ],
      documents: [
        {
          id: "ui-spec-doc",
          label: "ui-spec 문서",
          version: "v1",
          freshness: "fresh",
          status: "pass",
          approval: "approved",
        },
      ],
    },
    {
      id: "S03-orchestrator-starts-planning",
      title: "orchestrator 계획 순환 시작",
      summary: "orchestrator가 plan-maker, plan-tdd, plan-review를 순환시킨다.",
      dialogue: [
        {
          id: "codex-s03-1",
          speaker: "codex",
          text: "orchestrator가 plan-maker, plan-tdd, plan-review 순환을 시작합니다.",
        },
      ],
      nodes: [
        { id: "orchestrator", label: "orchestrator", role: "hub", status: "active" },
        { id: "plan-maker", label: "plan-maker", role: "agent", status: "active" },
        { id: "plan-tdd", label: "plan-tdd", role: "agent", status: "pending" },
        { id: "plan-review", label: "plan-review", role: "agent", status: "pending" },
      ],
      connectors: [
        {
          id: "orchestrator-to-plan-maker",
          kind: "forward",
          from: "orchestrator",
          to: "plan-maker",
          userNavigation: false,
        },
        {
          id: "plan-maker-to-plan-tdd",
          kind: "forward",
          from: "plan-maker",
          to: "plan-tdd",
          userNavigation: false,
        },
        {
          id: "plan-tdd-to-plan-review",
          kind: "forward",
          from: "plan-tdd",
          to: "plan-review",
          userNavigation: false,
        },
      ],
    },
    {
      id: "S04-plan-tdd-blocks-maker",
      title: "plan-tdd block → plan-maker 반환",
      summary: "plan-tdd가 테스트 경계를 block하고 plan-maker로 돌려보낸다.",
      loopReason: "plan-tdd에서 plan-maker로 돌아가는 업무 반환",
      dialogue: [
        {
          id: "reviewer-s04-1",
          speaker: "reviewer",
          text: "plan-tdd가 테스트 경계를 block했습니다. plan-maker로 돌아가 수정해야 합니다.",
        },
      ],
      nodes: [
        { id: "plan-tdd", label: "plan-tdd", role: "agent", status: "blocked" },
        { id: "plan-maker", label: "plan-maker", role: "agent", status: "pending" },
      ],
      connectors: [
        {
          id: "plan-tdd-to-plan-maker-block",
          kind: "block-return",
          from: "plan-tdd",
          to: "plan-maker",
          userNavigation: false,
        },
      ],
    },
    {
      id: "S05-plan-review-blocks-maker",
      title: "plan-review block → plan-maker 반환",
      summary: "plan-review가 plan 계약 결함을 block하고 별도 반환 arc를 만든다.",
      dialogue: [
        {
          id: "reviewer-s05-1",
          speaker: "reviewer",
          text: "plan-review가 계약 결함을 발견했습니다. plan-maker로 돌아가 수정이 필요합니다.",
        },
      ],
      nodes: [
        { id: "plan-review", label: "plan-review", role: "agent", status: "blocked" },
        { id: "plan-maker", label: "plan-maker", role: "agent", status: "pending" },
      ],
      connectors: [
        {
          id: "plan-review-to-plan-maker-block",
          kind: "block-return",
          from: "plan-review",
          to: "plan-maker",
          userNavigation: false,
        },
      ],
      documents: [
        {
          id: "plan-doc-revision",
          label: "plan 수정 slab",
          version: "v1",
          freshness: "stale",
          status: "fail",
          approval: "needs-change",
        },
      ],
    },
    {
      id: "S06-docs-needs-change",
      title: "planning docs 승인 gate: needs-change",
      summary: "planning docs 승인 gate에서 needs-change가 나와 plan-maker 수정으로 돌아간다.",
      dialogue: [
        {
          id: "reviewer-s06-1",
          speaker: "reviewer",
          text: "planning docs 승인 gate에서 needs-change 결정이 나왔습니다.",
        },
      ],
      nodes: [
        { id: "docs-gate", label: "planning docs gate", role: "gate", status: "blocked" },
        { id: "plan-maker", label: "plan-maker", role: "agent", status: "pending" },
      ],
      connectors: [
        {
          id: "docs-gate-to-plan-maker-needs-change",
          kind: "block-return",
          from: "docs-gate",
          to: "plan-maker",
          userNavigation: false,
        },
      ],
      approvalGate: {
        state: "needs-change",
        label: "planning docs: needs-change",
      },
    },
    {
      id: "S07-docs-reapproved",
      title: "docs 재승인 — v2, fresh tdd/review pass",
      summary: "plan-maker 수정 후 fresh plan-tdd, fresh plan-review, regenerated docs v2, re-approval.",
      dialogue: [
        {
          id: "codex-s07-1",
          speaker: "codex",
          text: "plan-tdd와 plan-review가 fresh 상태로 다시 통과했습니다. planning docs v2가 승인됩니다.",
        },
      ],
      nodes: [
        { id: "plan-maker", label: "plan-maker", role: "agent", status: "completed" },
        { id: "plan-tdd", label: "plan-tdd", role: "agent", status: "completed" },
        { id: "plan-review", label: "plan-review", role: "agent", status: "completed" },
        { id: "docs-gate", label: "planning docs gate", role: "gate", status: "completed" },
      ],
      documents: [
        {
          id: "planning-docs",
          label: "planning docs",
          version: "v2",
          freshness: "fresh",
          status: "pass",
          approval: "approved",
        },
        {
          id: "tdd",
          label: "plan-tdd",
          freshness: "fresh",
          version: "v2",
          status: "pass",
          approval: "approved",
        },
        {
          id: "review",
          label: "plan-review",
          freshness: "fresh",
          version: "v2",
          status: "pass",
          approval: "approved",
        },
      ],
      approvalGate: {
        state: "approved",
        label: "planning docs: approved",
      },
    },
    {
      id: "S08-runner-creates-worktree",
      title: "runner가 task worktree / branch 생성",
      summary: "plugin runner가 plan을 읽고 main에서 task worktree와 task branch를 만든다.",
      dialogue: [
        {
          id: "codex-s08-1",
          speaker: "codex",
          text: "runner가 feat/flow-3d-workflow worktree와 branch를 생성합니다.",
        },
      ],
      nodes: [
        { id: "runner", label: "plugin runner", role: "tool", status: "active" },
        { id: "main-branch", label: "main", role: "branch", status: "completed" },
        { id: "task-worktree", label: "feat/flow-3d-workflow worktree", role: "branch", status: "active" },
      ],
      connectors: [
        {
          id: "main-to-task-branch",
          kind: "forward",
          from: "main-branch",
          to: "task-worktree",
          userNavigation: false,
        },
      ],
      worktreeActive: true,
    },
    {
      id: "S09-phase-commits-accumulate",
      title: "phase commit 누적",
      summary: "runner가 plan phases를 실행하고 phase commit card를 누적한다.",
      dialogue: [
        {
          id: "codex-s09-1",
          speaker: "codex",
          text: "각 phase가 하나의 git commit으로 완료되어 worktree에 누적됩니다.",
        },
      ],
      nodes: [
        { id: "task-worktree", label: "feat/flow-3d-workflow worktree", role: "branch", status: "active" },
        { id: "frontend-developer", label: "frontend-developer", role: "agent", status: "active" },
      ],
      commits: [
        { id: "phase-1-commit", phase: 1, message: "feat(flow): create Vite app foundation", active: false },
        { id: "phase-2-commit", phase: 2, message: "feat(flow): define static workflow scenario data", active: false },
        { id: "phase-3-commit", phase: 3, message: "feat(flow): implement workflow playback state", active: true },
      ],
      worktreeActive: true,
    },
    {
      id: "S10-dev-review-rework-qa",
      title: "dev-review feedback → rework/QA",
      summary: "dev-review가 feedback을 주고 rework/QA loop가 필요하다.",
      dialogue: [
        {
          id: "reviewer-s10-1",
          speaker: "reviewer",
          text: "canvas 픽셀이 장면 상태와 불일치합니다. rework가 필요합니다.",
        },
        {
          id: "codex-s10-2",
          speaker: "codex",
          text: "rework commit을 생성하고 QA가 확인했습니다.",
        },
      ],
      nodes: [
        { id: "dev-review", label: "dev-review", role: "gate", status: "blocked" },
        { id: "task-worktree", label: "feat/flow-3d-workflow worktree", role: "branch", status: "active" },
      ],
      connectors: [
        {
          id: "dev-review-rework-return",
          kind: "rework-return",
          from: "dev-review",
          to: "task-worktree",
          userNavigation: false,
        },
      ],
      review: {
        feedbackReturnArc: true,
        reworkCommit: true,
        qaConfirmed: true,
      },
    },
    {
      id: "S11-user-merge-decision",
      title: "사용자 merge 결정",
      summary: "approval 후 runner가 merge/PR/later를 묻고 예시에서는 merge를 선택한다.",
      dialogue: [
        {
          id: "codex-s11-1",
          speaker: "codex",
          text: "dev-review가 승인했습니다. merge, PR 생성, 나중에 중 선택해 주세요.",
        },
        {
          id: "user-s11-2",
          speaker: "user",
          text: "merge로 진행합니다.",
        },
      ],
      nodes: [
        { id: "merge-gate", label: "merge decision gate", role: "gate", status: "active" },
      ],
      decision: {
        selected: "merge",
        rejected: ["pr", "later"],
      },
      approvalGate: {
        state: "merge-choice",
        label: "merge를 선택",
      },
    },
    {
      id: "S12-final-main-merge",
      title: "task branch → main 최종 merge",
      summary: "task branch가 main에 merge되어 전체 흐름이 완료된다.",
      dialogue: [
        {
          id: "codex-s12-1",
          speaker: "codex",
          text: "feat/flow-3d-workflow가 main에 merge되었습니다. 흐름이 완료되었습니다.",
        },
      ],
      nodes: [
        { id: "task-worktree", label: "feat/flow-3d-workflow", role: "branch", status: "completed" },
        { id: "main-end", label: "main", role: "branch", status: "completed" },
      ],
      connectors: [
        {
          id: "task-to-main-merge",
          kind: "forward",
          from: "task-worktree",
          to: "main-end",
          userNavigation: false,
        },
      ],
      merge: {
        target: "main",
        selectedChoice: "merge",
        complete: true,
      },
    },
  ],
};
