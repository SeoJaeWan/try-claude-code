import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

/**
 * developer review package 생성기의 CLI 동작을 검증하는 Node test suite.
 *
 * 임시 repository를 만들고 plan/review/evidence 파일을 직접 구성해,
 * 생성기가 UTF-8 보존, signature 유지, evidence 복사, 경로 방어를 지키는지 확인한다.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.resolve(__dirname, "..", "generate-developer-review-package.mjs");

/**
 * 한글 plan/review source를 UTF-8로 읽고 review-data/feedback/history를 생성하는 기본 성공 경로를 검증한다.
 */
test("writes developer review package as UTF-8 and preserves Korean text", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "orchestrator-review-"));
  const taskSlug = "korean-review";
  const planDir = path.join(repoRoot, "plans", taskSlug);
  const phaseDir = path.join(planDir, "phases");
  const reviewDir = path.join(repoRoot, "plans", "_orchestrator", "review", taskSlug);
  fs.mkdirSync(phaseDir, { recursive: true });
  fs.mkdirSync(reviewDir, { recursive: true });

  fs.writeFileSync(path.join(planDir, "plan.md"), `**Branch:** feat/${taskSlug}

# 한글 리뷰 패키지

| # | Phase | Agent |
| --- | --- | --- |
| 1 | \`./phases/01-core.md\` | \`general-developer\` |

## 요청과 범위

| 항목 | 내용 |
| --- | --- |
| 사용자 요청 | 한글이 깨지지 않는 review-data.json 생성 |
| 포함 범위 | UTF-8 읽기와 쓰기 |
| 제외 범위 | 없음 |
| 완료 기준 | 브라우저에서 한글이 그대로 보인다 |

## 변경 형상

계획 문서를 UTF-8로 읽고 리뷰 패키지도 UTF-8로 저장한다.

| 변경 축 | 현재 | 목표 |
| --- | --- | --- |
| 리뷰 데이터 | 수동 작성 | 생성 스크립트 |

## 잠긴 계약

| 계약 | 대상 경계 | input | output | 소유권 / no-op | 검증 위치 |
| --- | --- | --- | --- | --- | --- |
| 인코딩 | \`review-data.json\` | plan.md | 한글 JSON | 손상 금지 | 테스트 |

## 실행 흐름

| Phase | 목적 | 주요 변경 | 완료 신호 | 검증 | 커밋 경계 | 상세 문서 |
| --- | --- | --- | --- | --- | --- | --- |
| 단계 1. 생성기 | UTF-8 패키지를 만든다 | Node 생성기 추가 | JSON에 한글 보존 | JSON 파싱으로 한글 문자열을 확인한다 | phase 1: generate review package | \`./phases/01-core.md\` |

## 리스크와 검증

| 리스크 / 엣지 케이스 | 영향 | 완화 또는 검증 |
| --- | --- | --- |
| 기본 인코딩 사용 | 한글 손상 | UTF-8 바이트 확인 |

## 검토 체크리스트

- [ ] 한글 보존
`, "utf8");

  fs.writeFileSync(path.join(phaseDir, "01-core.md"), `# 단계 1. 생성기

- owner_agent: \`general-developer\`

## 목표와 완료 신호

| 항목 | 내용 |
| --- | --- |
| 목표 | 한글 review-data.json을 만든다 |
| 선행 조건 | none |
| output | UTF-8 JSON |
| 완료 신호 | 한글 문자열이 ?로 바뀌지 않는다 |

## 작업 흐름

| 순서 | 작업 | 이유 | 완료 조건 |
| --- | --- | --- | --- |
| 1 | Node 스크립트 실행 | 기본 인코딩 의존 제거 | 파일 생성 |

## 변경 경계

| \`boundary\` (변경 경계) | 변경 내용 | 유지할 것 | 제약 |
| --- | --- | --- | --- |
| \`developer-review\` | 패키지 생성 | UI 계약 | UTF-8 |

## 시나리오 / 계약

| scenario (시나리오) | input | output | negative/no-op | owner |
| --- | --- | --- | --- | --- |
| 패키지 생성 | 한글 plan.md | 한글 JSON | ? 치환 없음 | orchestrator |

## 파일 영향

| 파일 | 작업 방식 | 완료 조건 |
| --- | --- | --- |
| \`review-data.json\` | 생성 | UTF-8 |

## 검증

| 검증 항목 | 확인 수단 | 기대 결과 |
| --- | --- | --- |
| 한글 보존 | JSON 파싱 | 문자열 일치 |

## 리스크 / 주의점

| 리스크 | failure/validation | 대응 |
| --- | --- | --- |
| 손상된 원본 | 물음표 치환 발견 | 생성 중단 |
`, "utf8");

  fs.writeFileSync(path.join(reviewDir, "review.md"), `---
plan_path: plans/${taskSlug}/plan.md
task_slug: ${taskSlug}
plan_signature: fixed123
outcome: ready
next_action: developer_review
finding_signature: none
requires_user_decision: false
issue_codes: []
affected_phase_paths: []
---

# plan-review

- outcome: ready

## Findings

### Blocker

### Major

### Minor
`, "utf8");

  const result = spawnSync(process.execPath, [
    scriptPath,
    "--task-slug", taskSlug,
    "--plan-signature", "fixed123",
    "--now", "2026-04-29T00:00:00.000Z"
  ], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  const reviewDataPath = path.join(planDir, "developer-review", "review-data.json");
  const raw = fs.readFileSync(reviewDataPath);
  assert.ok(raw.includes(Buffer.from("한글 리뷰 패키지", "utf8")));

  const reviewData = JSON.parse(raw.toString("utf8"));
  assert.equal(reviewData.generator_contract_version, 2);
  assert.equal(reviewData.title, "한글 리뷰 패키지");
  assert.equal(reviewData.post_approval_next_action, "plan-tdd");
  assert.equal(reviewData.post_approval_next_label, "다음 단계: $plan-tdd");
  assert.match(reviewData.post_approval_next_summary, /TDD 계약 테스트/);
  assert.equal(reviewData.overview.user_request[0], "한글이 깨지지 않는 review-data.json 생성");
  assert.equal(reviewData.phases[0].owner_agent, "general-developer");
  assert.ok(reviewData.phases[0].validation.includes("JSON 파싱으로 한글 문자열을 확인한다"));
  assert.ok(reviewData.phases[0].file_impacts.includes("커밋 경계: phase 1: generate review package"));
  assert.match(reviewData.phases[0].review_item_signature, /^rvw-/);
  assert.deepEqual(reviewData.review_items.map((item) => item.id), ["overview", "P1"]);
  assert.ok(reviewData.review_items[0].anchors.some((anchor) => anchor.id === "scope"));

  const feedback = JSON.parse(fs.readFileSync(path.join(planDir, "developer-review", "feedback.json"), "utf8"));
  assert.equal(feedback.schema_version, 2);
  assert.deepEqual(Object.keys(feedback.item_status), ["overview", "P1"]);
  assert.deepEqual(feedback.item_status.overview, { approved: false });
  assert.deepEqual(feedback.item_status.P1, { approved: false });
  assert.deepEqual(feedback.comments, []);
  assert.equal(feedback.review_status, "in_progress");
});

/**
 * source artifact에 이미 손상 의심 물음표가 있으면 출력 파일을 쓰기 전에 실패하는지 검증한다.
 */
test("fails before writing when source prose already contains lossy question marks", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "orchestrator-review-lossy-"));
  const taskSlug = "lossy-review";
  const planDir = path.join(repoRoot, "plans", taskSlug);
  const phaseDir = path.join(planDir, "phases");
  const reviewDir = path.join(repoRoot, "plans", "_orchestrator", "review", taskSlug);
  fs.mkdirSync(phaseDir, { recursive: true });
  fs.mkdirSync(reviewDir, { recursive: true });
  fs.writeFileSync(path.join(planDir, "plan.md"), `# ?? ??\n\n| # | Phase | Agent |\n| --- | --- | --- |\n| 1 | \`./phases/01-core.md\` | \`general-developer\` |\n`, "utf8");
  fs.writeFileSync(path.join(phaseDir, "01-core.md"), "# 단계 1. 정상\n\n- owner_agent: `general-developer`\n", "utf8");
  fs.writeFileSync(path.join(reviewDir, "review.md"), "---\nplan_signature: fixed123\noutcome: ready\n---\n\n# plan-review\n", "utf8");

  const result = spawnSync(process.execPath, [
    scriptPath,
    "--task-slug", taskSlug,
    "--plan-signature", "fixed123"
  ], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /encoding-damaged/);
  assert.equal(fs.existsSync(path.join(planDir, "developer-review", "review-data.json")), false);
});

/**
 * 별도 phase detail 파일 없이 plan.md 안의 inline phase section을 읽어 review phase로 변환하는지 검증한다.
 */
test("reads inline phase detail sections from a self-contained plan", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "orchestrator-review-inline-"));
  const taskSlug = "inline-review";
  const planDir = path.join(repoRoot, "plans", taskSlug);
  const reviewDir = path.join(repoRoot, "plans", "_orchestrator", "review", taskSlug);
  fs.mkdirSync(planDir, { recursive: true });
  fs.mkdirSync(reviewDir, { recursive: true });

  fs.writeFileSync(path.join(planDir, "plan.md"), `# Inline phase review

## 요청과 범위

| 항목 | 내용 |
| --- | --- |
| 사용자 요청 | self-contained phase review |
| 포함 범위 | inline phase detail |
| 제외 범위 | linked phase files |
| 완료 기준 | phase contract appears in review-data |

## 실행 흐름

| Phase | 목적 | 주요 변경 | 완료 신호 | 검증 | 커밋 경계 |
| --- | --- | --- | --- | --- | --- |
| Phase 1 | registry를 만든다 | schema와 generator 추가 | registry 생성 | unit으로 검증 | phase 1: registry |

## Phase 상세 계약

### Phase 1 - registry source

#### 시나리오 / 계약

| scenario (시나리오) | input | output | negative/no-op | owner |
| --- | --- | --- | --- | --- |
| registry 생성 | source JSON | generated registry | live Figma 호출 금지 | registry layer |

#### 파일 영향

| 파일 | 작업 방식 | 완료 조건 |
| --- | --- | --- |
| src/registry | 생성 | schema-valid |

#### 리스크 / 주의점

| 리스크 | failure/validation | 대응 |
| --- | --- | --- |
| stale registry | digest mismatch | build gate 실패 |
`, "utf8");

  fs.writeFileSync(path.join(reviewDir, "review.md"), `---
plan_path: plans/${taskSlug}/plan.md
task_slug: ${taskSlug}
plan_signature: inline123
outcome: ready
next_action: planning_complete
finding_signature: none
requires_user_decision: false
issue_codes: []
affected_plan_paths: []
---

# plan-review

## Findings
`, "utf8");

  const result = spawnSync(process.execPath, [
    scriptPath,
    "--task-slug", taskSlug,
    "--plan-signature", "inline123",
    "--now", "2026-05-04T00:00:00.000Z"
  ], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  const reviewData = JSON.parse(fs.readFileSync(path.join(planDir, "developer-review", "review-data.json"), "utf8"));
  assert.equal(reviewData.phases.length, 1);
  assert.equal(reviewData.phases[0].title, "Phase 1 - registry source");
  assert.ok(reviewData.phases[0].contracts[0].includes("registry 생성"));
  assert.ok(reviewData.phases[0].file_impacts.includes("커밋 경계: phase 1: registry"));
  assert.ok(reviewData.phases[0].file_impacts.some((item) => item.includes("src/registry")));
  assert.ok(reviewData.phases[0].risks[0].includes("stale registry"));
});

/**
 * 파일/폴더 구조 계약과 `evidence/**` asset을 review-data에 포함하고 안전한 asset 위치로 복사하는지 검증한다.
 */
test("includes topology and safely copied evidence artifacts", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "orchestrator-review-evidence-"));
  const taskSlug = "evidence-review";
  const planDir = path.join(repoRoot, "plans", taskSlug);
  const evidenceDir = path.join(planDir, "evidence", "ui");
  const reviewDir = path.join(repoRoot, "plans", "_orchestrator", "review", taskSlug);
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.mkdirSync(reviewDir, { recursive: true });

  fs.writeFileSync(path.join(evidenceDir, "P1-empty.html"), "<!doctype html><html><body><button>Invite</button></body></html>\n", "utf8");
  fs.writeFileSync(path.join(planDir, "plan.md"), `# Evidence review

## 요청과 범위

| 항목 | 내용 |
| --- | --- |
| 사용자 요청 | users empty state를 계획 단계에서 확인 |
| 포함 범위 | route shell, empty UI, preview |
| 제외 범위 | 실제 API 호출 |
| 완료 기준 | review UI에서 topology와 preview를 확인 |

## 현재 근거

| 근거 | 확인 내용 | plan에 반영한 결론 |
| --- | --- | --- |
| \`src/app/users/page.tsx\` | users route가 아직 없음 | 새 route를 생성 |

## 기능 계약

| 계약 | 대상 경계 | input | output | negative/no-op | 소유권 | 검증 위치 |
| --- | --- | --- | --- | --- | --- | --- |
| empty state | \`users route\` | user list empty | empty copy and CTA | 실제 API 호출 없음 | frontend | component test |

## 파일/폴더 구조 계약

| 경로 | 종류 | 상태 | 소유 phase | 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| \`src/app/users/page.tsx\` | source | create | P1 | users route entry | 기존 app router 구조 확인 |
| \`plans/${taskSlug}/evidence/ui/P1-empty.html\` | artifact | create | P1 | empty state preview | planning review evidence |

## 체험 산출물

| id | phase | kind | 대상 단위 | 대상 수 / covered units | 경로 | input | function / adapter | output recipient | negative/no-op | 목적 | 검토 포인트 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UI-P1-empty | P1 | screen-preview | users empty route | 1/1 | \`evidence/ui/P1-empty.html\` | empty user list | none | users route screen | 실제 API 호출 없음 | empty 상태 UI 확인 | empty; CTA; mobile |

## 실행 흐름

| Phase | 목적 | 주요 변경 | 완료 신호 | 검증 | 커밋 경계 |
| --- | --- | --- | --- | --- | --- |
| Phase 1 | users route를 만든다 | route shell과 empty UI | empty preview와 동일한 상태 표시 | component test | phase 1: users empty |
`, "utf8");

  fs.writeFileSync(path.join(reviewDir, "review.md"), `---
plan_path: plans/${taskSlug}/plan.md
task_slug: ${taskSlug}
plan_signature: evidence123
outcome: ready
next_action: planning_complete
finding_signature: none
requires_user_decision: false
issue_codes: []
affected_plan_paths: []
---

# plan-review

## Findings
`, "utf8");

  const result = spawnSync(process.execPath, [
    scriptPath,
    "--task-slug", taskSlug,
    "--plan-signature", "evidence123"
  ], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  const reviewData = JSON.parse(fs.readFileSync(path.join(planDir, "developer-review", "review-data.json"), "utf8"));
  assert.equal(reviewData.topology_contract.length, 2);
  assert.equal(reviewData.phases[0].topology_contract.length, 2);
  assert.equal(reviewData.evidence_artifacts[0].asset, "assets/evidence/ui/P1-empty.html");
  assert.equal(reviewData.phases[0].evidence_artifacts[0].id, "UI-P1-empty");
  assert.equal(reviewData.evidence_artifacts[0].kind, "screen-preview");
  assert.equal(reviewData.evidence_artifacts[0].target_unit, "users empty route");
  assert.equal(reviewData.evidence_artifacts[0].covered_units, "1/1");
  assert.equal(reviewData.evidence_artifacts[0].input, "empty user list");
  assert.equal(reviewData.evidence_artifacts[0].function_adapter, "none");
  assert.equal(reviewData.evidence_artifacts[0].output_recipient, "users route screen");
  assert.equal(reviewData.evidence_artifacts[0].negative_noop, "실제 API 호출 없음");
  assert.deepEqual(reviewData.evidence_artifacts[0].review_points, ["empty", "CTA", "mobile"]);
  assert.match(reviewData.evidence_artifacts[0].content_hash, /^[a-f0-9]{12}$/);
  assert.equal(
    fs.existsSync(path.join(planDir, "developer-review", "assets", "evidence", "ui", "P1-empty.html")),
    true
  );
});

/**
 * plan의 체험 산출물 경로가 `evidence/**` 밖으로 빠져나가면 생성기가 거부하는지 검증한다.
 */
test("rejects evidence paths outside evidence root", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "orchestrator-review-evidence-bad-"));
  const taskSlug = "bad-evidence-review";
  const planDir = path.join(repoRoot, "plans", taskSlug);
  const reviewDir = path.join(repoRoot, "plans", "_orchestrator", "review", taskSlug);
  fs.mkdirSync(planDir, { recursive: true });
  fs.mkdirSync(reviewDir, { recursive: true });
  fs.writeFileSync(path.join(planDir, "plan.md"), `# Bad evidence

## 체험 산출물

| id | phase | kind | 경로 | 목적 | 검토 포인트 |
| --- | --- | --- | --- | --- | --- |
| BAD | P1 | ui-preview | \`../secret.html\` | bad path | security |

## 실행 흐름

| Phase | 목적 | 주요 변경 | 완료 신호 | 검증 | 커밋 경계 |
| --- | --- | --- | --- | --- | --- |
| Phase 1 | bad | bad | bad | bad | bad |
`, "utf8");
  fs.writeFileSync(path.join(reviewDir, "review.md"), "---\nplan_signature: bad123\noutcome: ready\n---\n\n# plan-review\n", "utf8");

  const result = spawnSync(process.execPath, [
    scriptPath,
    "--task-slug", taskSlug,
    "--plan-signature", "bad123"
  ], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Evidence path must be under evidence/);
  assert.equal(fs.existsSync(path.join(planDir, "developer-review", "review-data.json")), false);
});
