import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.resolve(__dirname, "..", "generate-developer-review-package.mjs");

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

| Phase | 목적 | 주요 변경 | 완료 신호 | 상세 문서 |
| --- | --- | --- | --- | --- |
| 단계 1. 생성기 | UTF-8 패키지를 만든다 | Node 생성기 추가 | JSON에 한글 보존 | \`./phases/01-core.md\` |

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
  assert.equal(reviewData.title, "한글 리뷰 패키지");
  assert.equal(reviewData.overview.user_request[0], "한글이 깨지지 않는 review-data.json 생성");
  assert.equal(reviewData.phases[0].owner_agent, "general-developer");
  assert.match(reviewData.phases[0].review_item_signature, /^rvw-/);

  const feedback = JSON.parse(fs.readFileSync(path.join(planDir, "developer-review", "feedback.json"), "utf8"));
  assert.deepEqual(Object.keys(feedback.steps), ["overview", "P1", "final"]);
  assert.equal(feedback.review_status, "in_progress");
});

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
