---
artifact_status: ready_for_planning
artifact_path: ./.codex/artifacts/brainstorm/flow-scenario-experience-website.md
task_slug: flow-scenario-experience-website
ui_direction_artifact: ./.codex/artifacts/ui-spec/flow-scenario-experience-website.md
supersedes:
  - ./.codex/artifacts/brainstorm/flow-scenario-website.md
  - ./.codex/artifacts/ui-spec/flow-scenario-website.md
created_from_planning_docs_feedback: ./plans/flow-scenario-website/planning-docs/feedback.json
created_for: "하나의 시나리오 안에서 brainstorm부터 plugin runner 종료까지 전체 플로우가 진행되는 과정을 자연스럽게 체득하는 flow/ Vite 사이트"
---

# flow 시나리오 체험형 사이트 request-lock

## 요청 대응표

| 사용자 요청 항목 | 이번 결정에서 고정한 내용 | 반영 대상 | 남은 미결정 |
| --- | --- | --- | --- |
| “지금 전혀 방향을 잘못잡았어” | 기존 `flow-scenario-website` plan은 설명형 홈페이지 방향으로 잘못 잡혔으므로 후속 planning input에서 제외한다 | 기존 brainstorm/UI-spec/plan lineage | 없음 |
| “하나의 시나리오로 전체 플로우가 진행되는 과정을 보길 원하는데” | 사이트의 중심은 설명 섹션이 아니라 하나의 작업 시나리오가 실제 흐름처럼 진행되는 체험이다 | 새 UI 방향, 콘텐츠 모델, 상태 전환, 검증 기준 | 없음 |
| “설명하기 위한 홈페이지잖아” | static article, homepage, timeline 설명문, preview gallery 중심 구성은 제외한다 | 화면 정보 구조, plan 제외 범위 | 없음 |
| “전체 플로우를 시나리오 기준으로 자연스럽게 체득하는 사이트” | 사용자는 시나리오 안에서 요청을 받고, 결정하고, 승인하고, runner로 넘기고, review 결과를 처리하는 과정을 단계별 행동으로 따라가야 한다 | `flow/` Vite 앱, interaction, scenario state | 없음 |
| “긴급이야. 전체 목표를 다시 잡아야할 수준” | 현재 planning loop는 중단하고 request-lock을 새 목표로 재작성한다 | orchestrator 라우팅 | 다음 조치: 새 request-lock과 UI-spec 기준으로 plan 재생성 |

## 작업 묶음 표

| 작업 묶음 | 이번에 바꾸는 것 | 유지되는 것 | 관련 영역 |
| --- | --- | --- | --- |
| 제품 목표 | “flow를 설명하는 웹사이트”에서 “flow를 체득하는 시나리오 체험 사이트”로 바꾼다 | root `flow/` Vite 앱 경계 | frontend, UI 방향 |
| 사용자 경험 | 사용자가 단계 설명을 읽는 구조가 아니라 시나리오 진행 상태를 직접 따라가는 구조로 바꾼다 | brainstorm부터 runner 종료까지의 실제 단계명과 산출물명 | frontend state, interaction |
| 콘텐츠 모델 | `요청 → 결정 잠금 → 계획 승인 → runner 실행 → dev-review → 종료 선택`이 하나의 진행 중인 사건처럼 이어진다 | 대표 시나리오는 릴리즈 체크 보드 frontend service 요청을 기본값으로 유지 가능 | scenario data |
| 화면 문법 | 홈페이지 hero + 설명 섹션 + artifact rail 중심 구성을 폐기한다 | 2D, no 3D, no live dashboard | UI-spec |
| 기존 plan 처리 | `plans/flow-scenario-website/plan.md`와 planning docs approval은 현재 목표 기준으로 폐기한다 | 이미 생긴 artifact는 증거로 보존 | orchestrator, plans |

## 실행 영역 표

| 실행 영역 | 이번 판단 | 근거 | 제외 또는 포함 이유 |
| --- | --- | --- | --- |
| frontend | 포함 | 사용자가 체험형 사이트를 원한다 | `flow/` Vite 앱의 화면, 상태, 상호작용이 핵심이다 |
| root tooling | 제한 포함 | Vite 실행 script와 test/build command가 필요할 수 있다 | 기존 script는 유지하고 `flow:*`만 추가한다 |
| scenario state | 포함 | “전체 플로우가 진행되는 과정”을 체득하려면 단계 진행, unlock, 선택 상태가 필요하다 | static data + app-local state로 충분하다 |
| backend/API/DB | 제외 | 실제 서비스 구현이나 API 저장이 목표가 아니다 | 시나리오 체험은 repo-local 정적 data로 처리한다 |
| plugin runner 동작 | 제외 | runner는 체험 대상이지 수정 대상이 아니다 | hook, state, dev-review runtime은 읽기 근거로만 사용한다 |
| `.codex` planning skill 정책 | 제외 | 플로우 정책을 바꾸는 것이 아니라 사용자가 이해하는 체험 사이트를 만든다 | planning docs/skill 코드는 수정하지 않는다 |

## 공개 경계 표

| 대상 | 공개 경계 | 상태 소유권 | callback / handoff | 비고 |
| --- | --- | --- | --- | --- |
| 체험형 사이트 | root `flow/` Vite React 앱 | app-local scenario state | 단계 진행, artifact unlock, gate action, branch 선택 | 설명형 홈페이지가 아니라 진행형 체험이다 |
| 시나리오 진행 | 하나의 작업 요청이 모든 단계를 통과하는 연속 흐름 | `flow` 앱 state/hook | `다음 행동`, `승인해보기`, `분기 보기`, `runner로 넘기기` 같은 UI action | 실제 runner 실행은 하지 않는다 |
| 산출물 등장 | request-lock, plan, tdd, review, planning docs, runner state, dev-review feedback | scenario data | 단계가 진행될 때 산출물이 등장하거나 잠금 해제된다 | artifact rail 고정 설명만으로 끝나면 실패 |
| browser gate 체험 | planning docs와 dev-review를 서로 다른 의사결정 장면으로 체험 | app-local state | approve/comment/rework/QA 선택의 의미를 시뮬레이션 | 실제 planning docs/dev-review UI 통합 아님 |
| 종료 선택 | merge/PR/later가 마지막 사용자 선택으로 등장 | app-local state | 선택 전에는 자동 완료로 보이지 않게 한다 | 실제 merge/PR 생성 없음 |

## 상태 소유권 표

| 대상 | 소유자 | 규칙 | 비고 |
| --- | --- | --- | --- |
| 현재 시나리오 단계 | `flow` 앱 | 사용자의 행동에 따라 다음 단계가 열린다 | 단순 스크롤 위치만으로 흐름을 대체하지 않는다 |
| 산출물 잠금 해제 | `flow` 앱 | 앞 단계 행동이 끝나면 다음 산출물이 나타난다 | 생성 주체와 소비 주체는 화면에서 보인다 |
| 선택 분기 | `flow` 앱 | planning feedback, plan-review blocked, dev-review rework, QA required를 체험 가능한 branch로 둔다 | happy path와 branch가 동시에 이해되어야 한다 |
| 실제 runner state | plugin runner | 읽거나 수정하지 않는다 | static scenario sample만 사용한다 |
| 실제 feedback file | planning docs/dev-review | 읽거나 수정하지 않는다 | 체험용 예시 comment/state만 사용한다 |

## 테스트 전략 잠금 표

| 목표 또는 위험 | 잠글 검증 | 검증 단위 | 관찰 지점 | 식별자 정책 | runner / command / spec root | mock / fixture 정책 | 제외 범위 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 설명형 홈페이지로 되돌아가는 위험 | 사용자의 action으로 단계가 진행되고 산출물이 unlock되는지 검증 | Component Test | active step, action button, unlocked artifact, branch state | role/label/heading 우선 | `npm run flow:test -- --run`, `flow/src/**/*.test.{ts,tsx}` | scenario static data | 단순 페이지 load smoke로 대체 금지 |
| 시나리오 체득감 | desktop/mobile에서 한 사건이 이어지는 느낌인지 확인 | manual/visual | 첫 진입, gate action, runner handoff, dev-review branch, final choice | visible text/state label | dev server URL | 없음 | pixel-perfect 비교 제외 |
| 실제 runtime 오해 방지 | runner/dev-review/live file을 읽지 않는지 검사 | command/review | `fetch`, `fs`, runner-state live read, plugin script 실행 부재 | 해당 없음 | source inspection | static fixture만 허용 | live dashboard 제외 |
| 접근성과 가독성 | action controls와 상태가 키보드/텍스트로 이해되는지 확인 | Component Test + manual/visual | button label, aria state, focus, overflow | role/label 우선 | `flow:test`, manual browser | 없음 | 색상만으로 상태 전달 금지 |

## 제외 항목 표

| 항목 | 처리 | 이유 | 사용자 승인 필요 여부 |
| --- | --- | --- | --- |
| 설명형 홈페이지 | 제외 | 사용자가 “설명하기 위한 홈페이지”가 아니라고 명시했다 | 다시 원하면 승인 필요 |
| 단순 timeline/article | 제외 | 체득이 아니라 설명에 머문다 | 다시 원하면 승인 필요 |
| 체험 산출물 preview를 최종 제품처럼 만드는 방향 | 제외 | planning evidence와 실제 앱 목표가 섞였다 | 없음 |
| 3D/Three.js | 제외 | 이전 결정 유지. 체험감은 interaction과 narrative state로 만든다 | 다시 원하면 승인 필요 |
| live runner dashboard | 제외 | 실제 runner state를 읽는 것이 아니라 흐름을 체험하는 사이트다 | 확장 시 승인 필요 |
| plugin runner/dev-review 코드 변경 | 제외 | 이번 목표는 flow 체험 사이트다 | 수정 요청 시 별도 잠금 필요 |

## plan wiki preflight 메모

| 검토 기준 | 이번에 잠근 내용 | 계획 입력 메모 | 남은 위험 |
| --- | --- | --- | --- |
| 출처 우선순위 | planning docs R2 피드백이 최신 사용자 의도다 | 이전 request-lock/UI-spec/plan은 superseded 처리 | 없음 |
| 공개 경계 | root `flow/` Vite 앱은 유지하되 제품 성격은 체험형으로 재정의 | 기존 `flow-scenario-website` task slug는 새 목표와 어긋남 | task slug는 `flow-scenario-experience-website` 권장 |
| UI 방향 | `.codex/artifacts/ui-spec/flow-scenario-experience-website.md`에서 운영형 시뮬레이터 방향을 잠갔다 | 체험형 화면 문법, action/state hierarchy, mobile 흐름을 새 UI-spec에서 소비한다 | 없음 |
| TDD 경계 | 사용자 action 기반 진행과 unlock state를 테스트 기준으로 삼아야 한다 | 기존 read-only explanation 테스트는 불충분 | plan-tdd 재작성 필요 |

## 진단 기준선 표

| 조사 경계 | 권위 기준 | 현재 확인 대상 | 확인한 증거 | 남은 공백 |
| --- | --- | --- | --- | --- |
| planning docs R2 | `feedback.json`의 최신 제출 comment | `plans/flow-scenario-website/planning-docs/feedback.json` | `overview/scope`에 “설명하기 위한 홈페이지가 아니라 시나리오 기준으로 자연스럽게 체득하는 사이트”라는 `needs-change`가 제출됨 | 없음 |
| 기존 request-lock | `.codex/artifacts/brainstorm/flow-scenario-website.md` | artifact status와 내용 | “설명”, “narrative flow”, “홈페이지형 화면 구성” 중심으로 잠겨 있음 | 새 목표와 불일치 |
| 기존 UI-spec | `.codex/artifacts/ui-spec/flow-scenario-website.md` | UI 방향 요약 | stage narrative, artifact rail, browser frame 중심 설명형 구조 | 체험형 action/state 문법 미잠금 |
| 기존 plan | `plans/flow-scenario-website/plan.md` | plan scope와 TDD | 설명형 website와 preview evidence 품질 보강까지 진행됨 | 새 목표 기준으로 폐기 필요 |

## 차이 후보 표

| 대상 | 확인된 차이 | 근거 | 수정 판단 여부 | planning 전달 메모 |
| --- | --- | --- | --- | --- |
| 제품 목표 | 설명형 홈페이지 vs 시나리오 체험형 사이트 | R2 feedback body | 수정 필요 | 기존 plan revision이 아니라 request-lock 재작성 |
| 상호작용 | 단계 선택/스크롤 중심 vs 사용자가 flow를 진행시키는 action 중심 | R2 “체득하는 사이트” | 수정 필요 | UI-spec에서 action grammar 잠금 |
| 산출물 표현 | artifact rail 설명 vs 단계 진행에 따른 artifact unlock | R2 “전체 플로우가 진행되는 과정” | 수정 필요 | scenario state model 재정의 |
| planning readiness | 기존 ready/approval 루프 vs 새 request-lock/UI-spec 기준 | R2 scope feedback과 새 UI-spec | 수정 필요 | 새 task slug로 planning 재시작 |

## planning-ready 판정표

| 상태 | 항목 | 판단 | 다음 조치 |
| --- | --- | --- | --- |
| ready | 공개 경계 | root `flow/` Vite 앱은 유지한다 | 새 UI-spec에서 이 경계를 소비 |
| ready | 제외 범위 | 3D, live runner dashboard, plugin runtime 변경은 제외한다 | plan에 유지 |
| ready | 대표 흐름 | `brainstorm`부터 plugin runner 종료까지 하나의 시나리오로 유지한다 | 체험형 화면으로 재해석 |
| ready | 제품 목표 | 기존 설명형 홈페이지 목표는 폐기하고 체험형 사이트로 다시 잡았다 | 이 artifact를 새 request-lock으로 사용 |
| ready | 사용자-visible UI 방향 | 체험형 interaction, action hierarchy, state presentation을 UI-spec에서 잠갔다 | `.codex/artifacts/ui-spec/flow-scenario-experience-website.md`를 함께 사용 |
| excluded | 기존 plan approval | `plans/flow-scenario-website/plan.md`는 새 목표 기준 planning input으로 쓰지 않는다 | 새 UI-spec 뒤 plan-maker 재실행 |

## 남은 질문 / 가정

- blocking 질문 없음. 사용자의 R2 피드백을 기준으로 제품 목표는 “설명형 홈페이지”가 아니라 “하나의 시나리오를 진행하며 flow를 체득하는 사이트”로 재잠금한다.
- 기본 가정: 대표 시나리오는 계속 “릴리즈 체크 보드 프론트 서비스를 만든다”를 사용할 수 있지만, 화면에서는 설명 대상이 아니라 사용자가 따라가는 사건으로 다룬다.
- 기본 가정: `flow/` 앱은 실제 runner나 feedback 파일을 live로 읽지 않고 static scenario data와 app-local state로 체험을 만든다.
- UI 방향은 `.codex/artifacts/ui-spec/flow-scenario-experience-website.md`를 기준으로 삼는다.

## 추천 다음 상태

`ready_for_planning`
