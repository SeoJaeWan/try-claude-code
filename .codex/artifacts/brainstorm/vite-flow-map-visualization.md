---
artifact_status: superseded
artifact_path: ./.codex/artifacts/brainstorm/vite-flow-map-visualization.md
task_slug: vite-flow-map-visualization
created_for: "Vite 환경에서 brainstorm부터 plugin runner 종료까지 전체 흐름을 가시성 있게 시각화"
superseded_by: ./.codex/artifacts/brainstorm/flow-scenario-website.md
superseded_reason: "사용자가 3D/atlas형 플로우 맵보다 하나의 시나리오를 따라가는 flow 폴더 웹사이트 방향으로 기획을 수정했다."
---

# Vite 플로우 맵 시각화 request-lock

## 요청 대응표

| 사용자 요청 항목 | 이번 결정에서 고정한 내용 | 반영 대상 | 남은 미결정 |
| --- | --- | --- | --- |
| 현재 `.codex`와 `plugin` 폴더의 하나의 흐름을 단계별로 보고 싶다 | `brainstorm`부터 planning 루프, planning docs 승인, `/runner`, worktree 실행, dev-review, rework/QA, merge/PR/later 선택까지 하나의 흐름으로 표현한다 | 새 Vite 앱 화면, 그래프 데이터, 단계 상세 패널 | 없음 |
| Vite 환경에서 가시성 있게 보여주길 원한다 | repo-local Vite 단일 페이지 앱으로 만든다. 문서형 markdown이나 Mermaid-only 산출물이 아니라 브라우저에서 열리는 실제 시각화 경험을 만든다 | `docs/flow-map/` 앱과 root 실행 script | Vite dev server port는 구현 시 사용 가능한 port로 파생 |
| 가독성과 화려함이 중요하다 | 전체 맵은 swimlane + metro/mission-control 스타일로 구성하고, 단계 클릭 시 상세 설명, 입력/출력 artifact, 차단 분기, 관련 파일을 보여준다 | UI 정보 구조, 색상 체계, 상호작용, 반응형 레이아웃 | 없음 |
| 시각화도 잘 해주는 방향이 좋다 | 단순 선형 목록이 아니라 main spine, loop edge, browser gate, artifact handoff, git/worktree lane을 시각적으로 구분한다 | 그래프 노드, edge, legend, spotlight interaction | 없음 |

## 작업 묶음 표

| 작업 묶음 | 이번에 바꾸는 것 | 유지되는 것 | 관련 영역 |
| --- | --- | --- | --- |
| Vite 앱 기반 구성 | `docs/flow-map/` 아래에 Vite 단일 페이지 앱을 추가하고 root script로 실행 가능하게 한다 | 기존 planning docs 서버와 dev-review 서버 동작은 바꾸지 않는다 | frontend, tooling |
| 플로우 데이터 모델 | `.codex` planning 단계와 `plugin/develop` runner 단계를 고정 데이터로 정의한다 | 런타임에서 plan 상태 파일을 자동 파싱하는 live dashboard는 이번 범위에서 제외한다 | frontend |
| 전체 플로우 맵 | swimlane, node, edge, loop, gate, artifact marker를 렌더링한다 | 기존 markdown docs는 대체하지 않고 참고 자료로 남긴다 | frontend |
| 단계 상세 경험 | 선택된 단계의 목적, 입력, 출력, 다음 분기, 관련 파일을 inspector 패널에 표시한다 | 기존 skill 문서의 원문 계약은 그대로 유지한다 | frontend |
| 검증 | Vite build가 통과하고, 기본 화면이 desktop/mobile에서 겹침 없이 보이는지 확인한다 | 기존 plugin runner 실행 방식은 검증 범위가 아니다 | command, manual/visual |

## 실행 영역 표

| 실행 영역 | 이번 판단 | 근거 | 제외 또는 포함 이유 |
| --- | --- | --- | --- |
| frontend | 포함 | 사용자가 Vite 환경의 시각적 화면을 요청했다 | 실제 브라우저 UI와 상호작용을 구현해야 한다 |
| root tooling | 제한 포함 | Vite 실행 script와 dependency가 필요하다 | 앱 실행에 필요한 최소 변경만 포함한다 |
| backend | 제외 | 서버 API나 DB 상태를 요구하지 않았다 | 정적/반정적 flow map으로 충분하다 |
| plugin runner 동작 | 제외 | 목표는 runner 동작 변경이 아니라 이해를 돕는 시각화다 | `/runner`, dev-review, state machine은 읽기 대상이며 수정 대상이 아니다 |
| plan wiki 정책 변경 | 제외 | 새 planning rule이나 wiki 정책을 요청하지 않았다 | 기존 정책을 시각화 근거로 사용만 한다 |

## 공개 경계 표

| 대상 | 공개 경계 | 상태 소유권 | callback / handoff | 비고 |
| --- | --- | --- | --- | --- |
| Vite 앱 | `docs/flow-map/`의 브라우저 화면 | 앱 내부 JS 상태 | 노드 선택, lane filter, overview/detail 전환 | 외부 서버 없이 동작하는 정적 데이터 우선 |
| root script | `npm run flow-map:dev`, `npm run flow-map:build`, 선택적 preview script | `package.json` | 사용자 실행 명령 | 기존 `test`, `plan-wiki:docs` 유지 |
| 그래프 데이터 | `.codex`와 `plugin/develop` 흐름을 표현하는 로컬 data module | 앱 내부 데이터 | 화면 렌더링 입력 | skill 문서 자동 파싱은 이번 범위 제외 |
| 단계 상세 패널 | 선택된 단계의 목적, 입력, 출력, 분기, 관련 파일 | 앱 내부 선택 상태 | 노드 클릭 또는 keyboard focus | 설명 문구는 한국어 우선 |
| 브라우저 검토 게이트 표현 | planning docs gate와 dev-review gate를 별도 visual motif로 표시 | 시각화 앱 | gate node와 loop edge | 둘 다 브라우저지만 검토 대상이 다름을 명확히 구분 |

## 상태 소유권 표

| 대상 | 소유자 | 규칙 | 비고 |
| --- | --- | --- | --- |
| 선택된 단계 | Vite 앱 | 사용자가 노드를 선택하면 inspector와 edge highlight가 갱신된다 | URL state는 선택 사항이며 필수 아님 |
| lane/filter 상태 | Vite 앱 | `.codex`, artifacts, plugin runner, git/worktree, browser gate를 토글할 수 있다 | 전체 흐름 이해를 해치지 않도록 기본은 모두 표시 |
| 실제 runner state | plugin runner | 시각화 앱이 수정하거나 실시간 해석하지 않는다 | 이번 앱은 설명형 atlas |
| planning docs/dev-review feedback | 기존 서버들 | 기존 browser gate가 그대로 소유한다 | 새 앱은 링크/설명만 제공 |

## 테스트 전략 잠금 표

| 목표 또는 위험 | 잠글 검증 | 검증 단위 | 관찰 지점 | 식별자 정책 | runner / command / spec root | mock / fixture 정책 | 제외 범위 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Vite 앱이 빌드 가능한지 | production build 통과 | command | `npm run flow-map:build` | 해당 없음 | root script | 없음 | runner/plugin 실행 검증 제외 |
| 주요 화면이 읽기 쉬운지 | desktop/mobile 수동 시각 검토 | manual/visual | 첫 화면, 단계 선택, 작은 화면 | 의미 있는 button label과 heading | dev server URL | 없음 | pixel-perfect 비교 제외 |
| 상호작용이 끊기지 않는지 | 노드 선택과 filter가 inspector/highlight를 갱신 | manual/visual 또는 Component Test 가능 | 선택된 노드 제목, 상세 패널, edge 상태 | role/label 우선, 필요한 경우 안정 id | 구현 시 선택 | 없음 | 전체 E2E 자동화는 이번 범위에서 필수 아님 |

## 제외 항목 표

| 항목 | 처리 | 이유 | 사용자 승인 필요 여부 |
| --- | --- | --- | --- |
| live runner dashboard | 제외 | 현재 요청은 전체 흐름 이해와 시각적 표현이 목표다 | 확장 시 승인 필요 |
| planning docs UI 내부 통합 | 제외 | 기존 승인 UI와 설명용 atlas의 역할이 섞인다 | 통합 요청 시 승인 필요 |
| dev-review UI 수정 | 제외 | 구현 리뷰 게이트는 현 상태를 설명 대상으로만 둔다 | 수정 요청 시 승인 필요 |
| Figma 기준 디자인 parity | 제외 | Figma URL이나 외부 시각 기준이 권위로 주어지지 않았다 | 필요 시 별도 inventory 필요 |
| Mermaid-only 문서 | 제외 | 사용자가 Vite 환경의 가시적 시각화를 원했다 | 없음 |

## plan wiki 사전 확인 메모

| 검토 기준 | 이번에 잠근 내용 | 계획 입력 메모 | 남은 위험 |
| --- | --- | --- | --- |
| 출처 우선순위 | repo-local skill/docs 흐름을 기준으로 삼는다 | `.codex/skills/**`, `plugin/develop/skills/**`, 기존 docs를 근거로 그래프를 구성한다 | skill 문서가 바뀌면 그래프 데이터도 수동 갱신 필요 |
| 의사결정 정책 | 사용자에게 보이는 화면 방향과 실행 영역을 계획 전에 고정했다 | `frontend-developer` 중심의 단일 UI 구현으로 계획 가능 | 없음 |
| frontend visual | “화려함”을 저장소 내부 관측 가능한 UI 기준으로 바꾼다 | swimlane, loop edge, gate motif, inspector, responsive no-overlap을 acceptance로 둔다 | 외부 디자인 기준이 추가되면 별도 기준선 필요 |
| frontend state | 실제 trigger로 상호작용을 검증한다 | 노드 선택, filter, detail panel 갱신을 같은 앱 surface에서 확인한다 | 자동 테스트 범위는 구현 계획에서 파생 가능 |

## 진단 기준선 표

| 조사 경계 | 권위 기준 | 현재 확인 대상 | 확인한 증거 | 남은 공백 |
| --- | --- | --- | --- | --- |
| `.codex` planning 흐름 | `brainstorm`, `orchestrator`, `plan-maker`, `plan-tdd`, `plan-review` skill 문서 | `.codex/skills/**`, `.codex/tools/**` | request-lock 이후 orchestrator가 plan-maker/TDD/review/planning docs gate를 소유함 | 세부 phase plan 예시는 구현 중 data로 정리 |
| `plugin/develop` runner 흐름 | `runner`, `dev-review`, hook 문서와 script | `plugin/develop/skills/runner/**`, `plugin/develop/skills/dev-review/**`, `plugin/develop/scripts/user-prompt-submit-hook.mjs` | `/runner` bootstrap, state JSON, worktree, foreground agent, browser dev-review, rework/QA/approved, merge 선택 흐름 확인 | live state 시각화는 제외 |
| Vite 현재 상태 | root `package.json` | root package scripts | 현재 repo에 Vite 앱과 Vite script 없음 | 구현에서 dependency/script 추가 필요 |

## planning-ready 판정표

| 상태 | 항목 | 판단 | 다음 조치 |
| --- | --- | --- | --- |
| ready | 사용자-visible UI 방향 | Vite 단일 페이지, swimlane flow atlas, inspector, loop/gate 시각화로 고정 | `plan-maker`에서 실행 계획 작성 |
| ready | 실행 영역 | frontend + 최소 root tooling 포함, backend/plugin runner 변경 제외 | `frontend-developer` 중심 계획 |
| ready | 공개 경계 | `docs/flow-map/` 앱, root script, 로컬 graph data, 단계 상세 패널로 고정 | 계획에서 파일 구조와 검증 명시 |
| derivable | 세부 색상 값과 애니메이션 지속 시간 | 구현자가 디자인 시스템 없이도 도출 가능 | 구현 중 responsive/contrast 기준으로 결정 |
| excluded | live runner 상태 해석 | 이번 범위 제외 | 후속 기능으로 별도 요청 |

## 남은 질문 / 가정

- 기본 가정: 첫 버전은 설명형 atlas이며, 실제 `.runner-state.json`이나 planning docs feedback을 실시간으로 읽는 dashboard가 아니다.
- 기본 가정: 대상 독자는 이 repo의 개발자와 plugin 흐름을 이해하려는 사용자다.
- 기본 가정: 구현 계획의 주 실행 agent는 `frontend-developer`이고, root script/dependency 변경은 Vite 앱 실행을 위한 최소 범위로 포함한다.

## 추천 다음 상태

`ready_for_planning`
