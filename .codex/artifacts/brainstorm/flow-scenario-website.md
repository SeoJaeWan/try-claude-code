---
artifact_status: superseded
artifact_path: ./.codex/artifacts/brainstorm/flow-scenario-website.md
task_slug: flow-scenario-website
supersedes: ./.codex/artifacts/brainstorm/vite-flow-map-visualization.md
superseded_by: ./.codex/artifacts/brainstorm/flow-scenario-experience-website.md
superseded_reason: "planning docs R2에서 사용자가 설명형 홈페이지 방향이 아니라 하나의 시나리오로 전체 플로우를 자연스럽게 체득하는 사이트가 목표라고 재정의함"
created_for: "flow 폴더 안의 Vite 웹사이트로 하나의 시나리오를 따라 brainstorm부터 plugin runner 종료까지 설명"
---

# flow 시나리오 웹사이트 request-lock

## 요청 대응표

| 사용자 요청 항목 | 이번 결정에서 고정한 내용 | 반영 대상 | 남은 미결정 |
| --- | --- | --- | --- |
| 3D까지는 필요 없을 것 같다 | 3D 장면, Three.js, 카메라 조작, 공간형 연출은 제외한다 | UI 방향, 기술 선택, 검증 범위 | 없음 |
| 하나의 시나리오를 가지고 설명하고 싶다 | 가상의 한 작업 요청이 `brainstorm`에서 시작해 planning, 승인, `/runner`, dev-review, rework/QA 가능성, 최종 선택까지 지나가는 narrative flow로 구성한다 | 페이지 정보 구조, 콘텐츠 모델, 단계별 화면 | 시나리오의 실제 주제명은 구현자가 repo 흐름에 맞게 낮은 위험 기본값으로 정한다 |
| `brainstorm`부터 plugin의 `runner`가 끝나는 흐름을 설명한다 | `.codex` planning 흐름과 `plugin/develop` runner 흐름을 하나의 이어지는 이야기로 보여준다 | 단계 구성, timeline, 관련 파일 링크 | 없음 |
| `flow` 폴더를 만들고 거기서 웹사이트를 만들면 어떨까 | repository root의 `flow/`를 새 웹사이트 공개 경계로 둔다. Vite 앱은 `flow/` 안에 둔다 | `flow/` 앱, root 실행 script | dev server port는 구현 시 파생 |
| 큰 기획 수정인지 확인 | 맞다. 기존 `docs/flow-map` atlas형 request-lock은 superseded 처리하고, 시나리오형 웹사이트로 방향을 바꾼다 | brainstorm artifact lineage | 없음 |

## 작업 묶음 표

| 작업 묶음 | 이번에 바꾸는 것 | 유지되는 것 | 관련 영역 |
| --- | --- | --- | --- |
| 웹사이트 기반 구성 | root `flow/` 아래 Vite 앱을 만든다 | 기존 `.codex`, `plugin`, `plans`, planning docs, dev-review 동작은 바꾸지 않는다 | frontend, root tooling |
| 시나리오 콘텐츠 | 한 작업 요청이 단계별로 어떻게 변환되는지 이야기 흐름으로 보여준다 | skill 문서의 실제 계약과 단계명은 왜곡하지 않는다 | frontend, docs |
| 시각 구조 | 3D 대신 editorial timeline + process board + handoff cards + branch strips를 사용한다 | 복잡한 live dashboard나 runtime state parser는 제외한다 | frontend |
| 상호작용 | 스크롤 진행, 단계 선택, branch 펼침, artifact 보기, 관련 파일 빠른 참조를 제공한다 | runner/dev-review 실제 상태를 수정하거나 실행하지 않는다 | frontend |
| 검증 | Vite build와 desktop/mobile 시각 확인을 완료 기준으로 둔다 | plugin runner 실행 자체는 검증 범위가 아니다 | command, manual/visual |

## 실행 영역 표

| 실행 영역 | 이번 판단 | 근거 | 제외 또는 포함 이유 |
| --- | --- | --- | --- |
| frontend | 포함 | 사용자가 웹사이트와 시각화를 요청했다 | `flow/` Vite 화면 구현이 핵심이다 |
| root tooling | 제한 포함 | Vite 실행 script와 dependency가 필요할 수 있다 | 기존 root scripts는 유지하고 새 flow script만 추가한다 |
| backend | 제외 | API, DB, 서버 상태가 필요하지 않다 | 정적 Vite 콘텐츠로 충분하다 |
| plugin runner 동작 | 제외 | 목표는 runner를 설명하는 웹사이트다 | runner state, hooks, dev-review 로직은 수정하지 않는다 |
| `.codex` skill 정책 | 제외 | 정책 변경이 아니라 흐름 설명이 목적이다 | 읽기 근거로만 사용한다 |

## 공개 경계 표

| 대상 | 공개 경계 | 상태 소유권 | callback / handoff | 비고 |
| --- | --- | --- | --- | --- |
| flow 웹사이트 | `flow/` 아래 Vite 앱 | 앱 내부 상태 | 스크롤 위치, 단계 선택, branch 펼침 | root `docs/flow-map`가 아니라 root `flow/`가 기준 |
| 실행 명령 | root `package.json` script | root tooling | `npm run flow:dev`, `npm run flow:build` | 기존 `test`, `plan-wiki:docs` 유지 |
| 시나리오 데이터 | `flow/src` 내부 데이터 module 또는 가까운 equivalent | 앱 내부 렌더링 | timeline, 단계 카드, branch, 관련 파일 표시 | skill 문서 자동 파싱은 제외 |
| 사용자-visible 콘텐츠 | 한국어 중심 설명과 정확한 path/identifier | flow 웹사이트 | 단계별 입력/출력/결정/다음 이동 | 과도한 내부 taxonomy 대신 사용자 이해 우선 |
| 관련 파일 참조 | 화면 안의 경로 표시 | 읽기 전용 | `.codex/skills/**`, `plugin/develop/skills/**`, hook/script 경로 | 클릭 가능한 링크 여부는 구현에서 파생 가능 |

## 상태 소유권 표

| 대상 | 소유자 | 규칙 | 비고 |
| --- | --- | --- | --- |
| 현재 선택 단계 | flow 웹사이트 | 선택/스크롤에 따라 설명과 visual emphasis가 바뀐다 | URL deep-link는 필수 아님 |
| branch 펼침 상태 | flow 웹사이트 | rework, QA, planning feedback 같은 분기는 접고 펼칠 수 있다 | 기본은 happy path 중심 |
| 실제 `.runner-state.json` | plugin runner | 웹사이트가 읽거나 수정하지 않는다 | live dashboard는 제외 |
| planning docs/dev-review feedback | 기존 browser gate | 웹사이트가 생성/제출하지 않는다 | 설명과 참조만 제공 |

## 테스트 전략 잠금 표

| 목표 또는 위험 | 잠글 검증 | 검증 단위 | 관찰 지점 | 식별자 정책 | runner / command / spec root | mock / fixture 정책 | 제외 범위 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Vite 웹사이트가 빌드되는지 | production build 통과 | command | `npm run flow:build` | 해당 없음 | root script | 없음 | plugin runner 실행 검증 제외 |
| 시나리오가 한눈에 읽히는지 | desktop/mobile 수동 시각 검토 | manual/visual | hero, timeline, 단계 상세, branch strip | heading, button label, landmark role 우선 | dev server URL | 없음 | pixel-perfect 비교 제외 |
| 상호작용이 흐름 이해를 돕는지 | 단계 선택과 branch 펼침이 콘텐츠를 바꾼다 | manual/visual 또는 Component Test 가능 | active step, 상세 패널, branch content | role/label 우선 | 구현 시 파생 | 없음 | 전체 E2E 필수 아님 |
| 3D 제외가 유지되는지 | Three.js/canvas 3D 의존성 부재 확인 | command 또는 review | dependency와 화면 구조 | 해당 없음 | build/review | 없음 | 2D CSS/SVG 장식은 허용 |

## 제외 항목 표

| 항목 | 처리 | 이유 | 사용자 승인 필요 여부 |
| --- | --- | --- | --- |
| 3D/Three.js | 제외 | 사용자가 굳이 필요 없다고 방향을 수정했다 | 다시 원하면 승인 필요 |
| `docs/flow-map/` atlas | superseded | 새 공개 경계는 root `flow/` 웹사이트다 | 없음 |
| live 상태 dashboard | 제외 | 시나리오 설명형 웹사이트가 목표다 | 확장 시 승인 필요 |
| plugin runner 코드 수정 | 제외 | runner는 설명 대상이지 변경 대상이 아니다 | 수정 요청 시 승인 필요 |
| planning docs/dev-review UI 통합 | 제외 | 기존 gate UI와 flow 설명 웹사이트의 역할이 다르다 | 통합 요청 시 승인 필요 |

## plan wiki 사전 확인 메모

| 검토 기준 | 이번에 잠근 내용 | 계획 입력 메모 | 남은 위험 |
| --- | --- | --- | --- |
| 출처 우선순위 | repo-local skill 문서와 plugin 문서를 흐름 근거로 사용한다 | `.codex/skills/**`, `plugin/develop/skills/**`, `plugin/develop/scripts/**`를 읽고 콘텐츠를 구성한다 | 문서가 바뀌면 flow 콘텐츠도 갱신 필요 |
| 의사결정 정책 | 사용자-visible 방향, 공개 경계, 제외 범위를 계획 전에 고정했다 | `flow/` Vite 웹사이트로 계획 가능 | 시나리오 이름은 low-risk 기본값 |
| frontend visual | “화려함”을 2D 웹사이트 기준으로 번역했다 | editorial timeline, process board, branch strip, artifact card, responsive no-overlap을 acceptance로 둔다 | 외부 디자인 기준 없음 |
| frontend state | 실제 사용자 트리거가 콘텐츠 전환을 만든다 | 선택/펼침/스크롤 기반 상태를 같은 surface에서 검증한다 | 자동 테스트 수준은 구현 계획에서 파생 |

## 진단 기준선 표

| 조사 경계 | 권위 기준 | 현재 확인 대상 | 확인한 증거 | 남은 공백 |
| --- | --- | --- | --- | --- |
| 기존 request-lock | `.codex/artifacts/brainstorm/vite-flow-map-visualization.md` | artifact frontmatter와 본문 | 기존 방향은 `docs/flow-map` atlas형이었다 | superseded 처리 완료 |
| 현재 repo 앱 상태 | root `package.json`, directory tree | package scripts, root folders | root `flow/`는 아직 없고 Vite script도 없다 | 구현에서 추가 |
| `.codex` to plugin 흐름 | 기존 skill/docs | brainstorm, orchestrator, runner, dev-review 문서 | 단계 흐름은 로컬 문서에서 도출 가능 | 시나리오 문장 구성은 구현 단계에서 작성 |

## planning-ready 판정표

| 상태 | 항목 | 판단 | 다음 조치 |
| --- | --- | --- | --- |
| ready | 큰 기획 수정 여부 | 기존 atlas형 시각화에서 시나리오형 웹사이트로 변경하는 큰 방향 수정으로 확정 | 새 artifact를 planning input으로 사용 |
| ready | 사용자-visible UI 방향 | 3D 제외, 2D editorial/process website, scenario 중심으로 고정 | `plan-maker`에서 실행 계획 작성 |
| ready | 공개 경계 | root `flow/` Vite 웹사이트와 root script로 고정 | 파일 구조와 명령을 계획에 반영 |
| ready | 실행 영역 | frontend + 최소 root tooling 포함, backend/plugin runner 수정 제외 | `frontend-developer` 중심 계획 |
| excluded | live dashboard와 plugin 코드 변경 | 이번 범위에서 제외 | 후속 요청 때 별도 잠금 |

## 시나리오 상세 잠금 표

| 항목 | 확정 내용 | 이유 | 화면 반영 |
| --- | --- | --- | --- |
| 대표 시나리오 | “릴리즈 체크 보드 프론트 서비스를 만든다” | `frontend-dev`의 stack/convention discovery, UI 구조, custom hook, 상태 관리, API 연동, 반응형 화면, 테스트 흐름을 모두 자연스럽게 보여준다 | 첫 hero의 사용자 요청 카드와 전체 timeline의 기준 이야기 |
| 시나리오 원문 | “릴리즈 전에 팀이 확인해야 할 항목을 한 화면에서 보고, 담당자/상태로 필터링하고, 체크 완료 상태를 저장할 수 있는 프론트 서비스를 만들어줘. 기존 UI 관례와 API hook 패턴을 따르고 loading/empty/error 상태와 모바일 화면도 챙겨줘.” | brainstorm이 잠가야 하는 화면 범위, 상태 소유권, API 연동, 반응형, 검증 기준이 분명하다 | raw request 말풍선 |
| 작업 성격 | 가상의 frontend service 작업 | 특정 실제 product repo 구현이 아니라 `.codex → plugin runner` 흐름을 설명하기 위한 교육용 예시다 | “예시 서비스” 배지로 실제 repo 변경과 구분 |
| 실행 agent | `frontend-developer` | UI components, hooks, state management, API integration 역할과 일치한다 | runner dispatch 단계 카드 |
| happy path | brainstorm request-lock → orchestrator planning loop → planning docs 승인 → `/runner plans/release-check-board/plan.md` → worktree → frontend-developer commits → dev-review approved → merge/PR/later | 전체 흐름을 가장 적게 굽히고 보여준다 | 메인 spine |
| optional branch | planning docs feedback, plan-review blocked, dev-review rework, QA required | 실제 흐름에서 사용자가 헷갈리기 쉬운 분기다 | 접고 펼치는 branch strip |

## 화면 구성 잠금 표

| 구역 | 역할 | 보여줄 내용 | 상호작용 |
| --- | --- | --- | --- |
| 첫 화면 | “이 웹사이트가 어떤 흐름을 설명하는지”를 즉시 보여준다 | 시나리오 원문, 전체 여정 요약, `brainstorm → runner complete` 진행 바 | 시작 버튼이 첫 단계로 스크롤 |
| 시나리오 spine | 사용자가 길을 잃지 않게 하는 중심 축 | 12개 단계: 요청, brainstorm, request-lock artifact, orchestrator, plan-maker, plan-tdd, plan-review, planning docs, `/runner`, worktree/agent, dev-review, 종료 선택 | 단계 클릭 시 상세 패널 갱신 |
| 단계 상세 패널 | 각 단계의 “무엇을 받고 무엇을 내보내는지” 설명 | 목적, 입력, 출력 artifact, 다음 이동, 실패/분기 조건, 관련 파일 | 현재 선택 단계 강조 |
| artifact rail | `.codex/artifacts`, `plans/**`, `.runner-state.json`, `dev-review/feedback.json`의 이동을 보여준다 | request-lock, `plan.md`, `tdd.md`, `review.md`, planning docs package, runner state, review-data/feedback | artifact 클릭 시 설명 카드 표시 |
| browser gate 구역 | 두 browser gate를 혼동하지 않게 분리한다 | planning docs는 “계획 승인”, dev-review는 “구현 커밋 리뷰”로 표시 | gate별 approve/comment/rework 결과 표시 |
| git/worktree 구역 | runner의 실행 모델을 시각화한다 | base branch는 고정, worktree 생성, task branch commits, cleanup 후 merge/PR/later | branch diagram highlight |
| 마지막 요약 | 사용자가 흐름을 기억하게 한다 | “어떤 산출물이 다음 단계의 입력이 되는가” 요약 | 전체 flow 다시 보기 버튼 |

## 시각 방향 잠금 표

| 항목 | 확정 내용 | 피해야 할 것 | 비고 |
| --- | --- | --- | --- |
| 시각 언어 | 2D editorial process website | 3D, 과한 canvas, 게임 같은 카메라 연출 | 명료함 우선, 화려함은 정보 밀도와 motion으로 처리 |
| 레이아웃 | 좌측 또는 상단 진행 spine + 중앙 stage narrative + 우측 detail/rail 조합 | 단순 세로 문서, Mermaid-only, 카드만 나열 | desktop에서는 넓게, mobile에서는 chapter stack |
| 그래픽 | branch line, artifact envelope, terminal strip, browser frame, commit stack, approval stamp | 실제 제품 screenshot인 척하는 이미지 | process 자체가 visual asset 역할 |
| 색상 | neutral base + 단계별 accent: brainstorm, planning, browser gate, runner, git, done을 구분 | 보라/파랑 단색 theme, 어두운 slate 일색 | 색은 의미 구분용 |
| 움직임 | scroll progress, active step glow, edge drawing, branch expand/collapse | 화면을 읽기 어렵게 하는 parallax/3D illusion | 모션은 이해 보조 |
| 문체 | 한국어 중심, path와 command는 원문 유지 | 내부 taxonomy만 늘어놓기 | 사용자가 “아 그래서 다음에 뭐가 생기지?”를 알게 한다 |

## 단계 목록 잠금 표

| 순서 | 단계 이름 | 설명 초점 | 대표 출력 |
| --- | --- | --- | --- |
| 1 | 사용자 요청 | 릴리즈 체크 보드 서비스 요구가 아직 화면 범위, 상태, API 연동, 반응형, 검증 기준이 덜 잠긴 상태로 들어온다 | raw request |
| 2 | `brainstorm` | 화면 범위, 상태 소유권, API hook 경계, loading/empty/error 상태, 모바일 검증, frontend owner를 잠근다 | request-lock artifact |
| 3 | request-lock artifact | planning이 추측하지 않도록 결정표와 실행 영역을 넘긴다 | `.codex/artifacts/brainstorm/...md` |
| 4 | `orchestrator` | plan wiki와 기존 artifact를 확인하고 planning loop를 시작한다 | task slug, handoff packet |
| 5 | `plan-maker` | `frontend-developer`가 실행 가능한 self-contained plan을 쓴다 | `plans/release-check-board/plan.md` |
| 6 | `plan-tdd` | plan clauses를 Component Test, selected E2E, manual visual smoke gate로 바꾼다 | `tdd.md`, source-tree tests |
| 7 | `plan-review` | plan과 TDD가 실행 가능한지 cold review한다 | `plans/_orchestrator/review/.../review.md` |
| 8 | planning docs | 사용자가 계획과 TDD를 브라우저에서 승인한다 | planning docs `feedback.json` |
| 9 | `/runner` 진입 | hook이 plan path를 검증하고 runner bootstrap을 넘긴다 | `[runner-skill bootstrap]` |
| 10 | worktree + agent | runner가 state를 만들고 worktree에서 `frontend-developer`를 foreground dispatch한다 | `.runner-state.json`, phase commits |
| 11 | dev-review | 구현 커밋을 브라우저에서 리뷰하고 rework/QA/approved로 분기한다 | `dev-review/review-data.json`, `feedback.json` |
| 12 | runner 종료 | 승인 후 worktree cleanup, merge/PR/later 선택으로 끝난다 | branch summary, diff stat, final choice |

## 화면 흐름 잠금 표

| 화면 또는 구간 | 사용자가 보는 것 | 전달해야 하는 핵심 | 다음 이동 |
| --- | --- | --- | --- |
| 1. 시작 화면 | “릴리즈 체크 보드 프론트 서비스” 요청 카드, 전체 여정 미니맵, 시작 버튼 | 이 웹사이트는 하나의 요청이 실행 완료까지 가는 과정을 따라간다 | 시작 버튼 또는 첫 단계 선택으로 `brainstorm` 구간 진입 |
| 2. 요청 잠금 구간 | 사용자 요청 말풍선, 불확실한 항목 칩, 잠금 후 결정표 | `brainstorm`은 바로 구현하지 않고 화면 범위, 상태, API hook, 검증 기준을 먼저 고정한다 | request-lock artifact 카드로 이동 |
| 3. 계획 생성 구간 | `.codex` lane의 orchestrator control panel, plan-maker/TDD/review loop | planning은 plan만 쓰는 것이 아니라 TDD와 review까지 순환한다 | planning docs browser gate로 이동 |
| 4. 계획 승인 구간 | planning docs browser frame, 승인 체크, comment branch | 사용자는 구현 전 plan과 TDD 계약을 브라우저에서 승인한다 | 승인 결과가 `/runner` 진입을 연다 |
| 5. runner 진입 구간 | terminal strip: `/runner plans/release-check-board/plan.md`, hook bootstrap | hook은 plan path만 검증하고 runner가 state/worktree를 만든다 | worktree diagram으로 이동 |
| 6. 구현 실행 구간 | base branch, task branch, worktree, `frontend-developer` dispatch, phase commit stack | main HEAD는 base에 남고 agent가 worktree에서 phase별 commit을 만든다 | dev-review browser gate로 이동 |
| 7. 구현 리뷰 구간 | GitHub-style diff browser, comment pins, rework/QA/approved 선택 | dev-review는 계획 리뷰가 아니라 이미 만들어진 구현 커밋 리뷰다 | approved면 runner 종료, rework/QA면 branch panel |
| 8. 종료 선택 구간 | worktree cleanup, commit summary, diff stat, 세 가지 선택 카드 | runner는 승인 후에도 merge/PR/later를 사용자 승인 없이 결정하지 않는다 | 전체 flow 요약 또는 다시 보기 |

## 플로우별 표현 방식 잠금 표

| 플로우 | 표현 방식 | 사용자에게 보일 문법 | 강조할 차이 |
| --- | --- | --- | --- |
| `brainstorm` | 잠금 보드 | 열린 질문 칩이 결정 행으로 바뀌고, request-lock artifact가 생성된다 | 구현 전 결정 단계 |
| request-lock artifact | 문서 카드 + handoff arrow | “화면 범위”, “상태 소유권”, “실행 영역”, “테스트 전략” 행이 다음 단계로 전달된다 | 채팅 기억이 아니라 durable artifact |
| `orchestrator` | control panel | plan wiki refresh, plan-maker, plan-tdd, plan-review가 같은 panel 안에서 순환한다 | cross-skill workflow owner |
| `plan-maker` | blueprint sheet | 화면 구조, API hook, 상태, 검증, owner agent가 plan으로 정리된다 | 실행 가능한 self-contained plan |
| `plan-tdd` | red contract rack | Component Test, selected E2E, manual visual smoke가 plan row와 연결된다 | 구현 전 실패 가능한 계약 |
| `plan-review` | cold review stamp | blocked/ready-with-findings/ready stamp와 finding loop | planning docs 전에 fresh review 필요 |
| planning docs | browser frame | left target list, approve checkbox, comment marker, Submit | plan/TDD 승인 gate |
| `/runner` hook | terminal + bootstrap receipt | 입력 command와 `[runner-skill bootstrap]` 출력 | hook은 path sanity만 수행 |
| runner state | compact JSON badge | `plan_path`, `owner_agent`, `base_branch`, `task_branch`, `worktree_path`, `dev_review.phase` | runner resume의 source of truth |
| worktree/agent | branch rail + commit stack | `frontend-developer`가 phase commit을 쌓고 main HEAD는 base에 남는다 | 구현은 worktree에서 발생 |
| dev-review | diff browser | commit sidebar, Files Changed, line comment, dispatch agent select | 구현 커밋 리뷰 gate |
| rework/QA branch | side branch strip | needs-change는 rework dispatch, question은 chat answer 후 재제출 | approved 전에는 종료 불가 |
| runner 종료 | decision cards | base 병합, PR 생성, 나중에 처리 | 사용자의 최종 선택 필요 |

## 화면 전환 잠금 표

| 전환 | 트리거 | 화면 변화 | 지켜야 할 제약 |
| --- | --- | --- | --- |
| 시작 → 단계 탐색 | 시작 버튼, 미니맵 첫 항목 클릭 | 첫 단계가 active가 되고 spine이 해당 위치로 스크롤된다 | landing 설명만 보고 끝나지 않게 즉시 flow로 진입한다 |
| 단계 선택 | spine node 클릭 또는 keyboard focus | 중앙 narrative와 우측 artifact/detail panel이 같은 단계로 갱신된다 | text overlap 없이 active 상태가 명확해야 한다 |
| 다음/이전 단계 | 고정 nav button 또는 keyboard | active step이 순차 이동하고 branch는 필요할 때 접힌 상태로 유지된다 | 모바일에서도 버튼 문구가 잘리지 않는다 |
| artifact 보기 | artifact rail card 클릭 | 해당 artifact의 역할, 생성 주체, 소비 주체가 drawer 또는 inline panel에 열린다 | 실제 파일을 수정하거나 live read하지 않는다 |
| browser gate 보기 | planning docs/dev-review frame 클릭 | gate 내부의 approve/comment/rework semantics가 확대 표시된다 | 두 gate의 목적을 혼동하지 않게 라벨을 유지한다 |
| optional branch 펼침 | “분기 보기” toggle | planning feedback, review blocked, rework, QA branch가 side strip으로 펼쳐진다 | happy path spine은 계속 보인다 |
| 종료 요약 이동 | 마지막 단계 도달 또는 요약 버튼 | 전체 artifact chain과 최종 선택 카드가 보인다 | merge/PR/later 중 하나를 자동 선택하는 UI처럼 보이면 안 된다 |

## 반응형 화면 잠금 표

| viewport | 구성 | 우선순위 | 제약 |
| --- | --- | --- | --- |
| desktop wide | 좌측 spine, 중앙 narrative, 우측 artifact/detail rail | 전체 관계를 한눈에 보여준다 | 카드 안 카드 금지, 긴 path는 줄바꿈 |
| laptop | 상단 compact progress + 중앙 narrative + 접히는 detail panel | 읽기 흐름 유지 | sticky 요소가 본문을 가리지 않는다 |
| mobile | chapter stack + 하단 이전/다음 controls + 접히는 artifact panel | 한 단계씩 명확히 읽는다 | 가로 스크롤 의존 금지 |

## 라이브러리 선택 잠금 표

| 분류 | 선택 | 용도 | 판단 |
| --- | --- | --- | --- |
| 앱 기반 | `Vite`, `React`, `React DOM`, `@vitejs/plugin-react` | root `flow/`의 Vite React 웹사이트 기반 | 포함 |
| 언어/타입 | `TypeScript` | 시나리오 단계, artifact, branch, visual lane 데이터를 안전하게 모델링 | 포함 |
| 애니메이션 | `motion` | scroll progress, active step transition, branch expand/collapse, artifact highlight | 포함 |
| 아이콘 | `lucide-react` | terminal, file, browser, git branch, check, alert, route 같은 의미 아이콘 | 포함 |
| 스타일 | hand-written CSS + CSS custom properties | editorial process website의 고유한 visual system 구성 | 포함 |
| 접근성 primitive | native button/details/dialog 우선, 필요할 때만 Radix primitive | accordion/drawer/dialog가 복잡해질 때 보강 | 보류 |
| 그래프/노드 에디터 | `@xyflow/react` | zoom/pan node graph가 필요할 때만 사용 | v1 제외 |
| utility-first CSS | Tailwind CSS | 빠른 utility styling | v1 제외 |
| 3D | Three.js, React Three Fiber | 3D 장면 | 제외 |
| 전역 상태 | Zustand/Redux/Jotai | 복잡한 cross-page 상태 | 제외, React state/useReducer로 충분 |
| 라우팅 | React Router | 다중 page route | 제외, 단일 페이지 + anchor/hash로 충분 |

## 라이브러리 근거 표

| 선택 또는 제외 | 근거 | 계획 입력 메모 |
| --- | --- | --- |
| `@vitejs/plugin-react` 포함 | Vite 공식 plugin 문서는 React Fast Refresh 지원을 공식 React plugin 역할로 설명한다 | Vite config에 React plugin을 둔다 |
| `motion` 포함 | Motion 공식 문서는 React용 production-grade animation, scroll/layout/gesture animation, `motion/react` import를 제공한다 | CSS transition으로 부족한 step/scroll/branch 전환에만 사용한다 |
| `lucide-react` 포함 | Lucide 공식 문서는 tree-shakeable SVG icon package와 customization을 제공한다 | 의미 아이콘을 직접 SVG로 그리지 않는다 |
| `@xyflow/react` 제외 | React Flow 공식 문서는 nodes/edges/viewport 중심의 interactive flowgraph를 제공한다 | 이번 UI는 pan/zoom node editor가 아니라 narrative website이므로 과하다 |
| Tailwind 제외 | Tailwind 공식 문서는 Vite plugin 설치를 제공하지만, 이번 앱은 bespoke visual language가 중요하다 | class-heavy utility보다 CSS variables와 component CSS로 화면 문법을 직접 통제한다 |
| Radix 보류 | Radix 공식 문서는 accessible unstyled primitives를 제공한다 | native semantics로 충분하지 않은 dialog/tooltip이 생기면 개별 도입한다 |
| Vitest 보류 | Vitest 공식 문서는 Vite-native test runner와 React component testing, jsdom/happy-dom 환경을 지원한다 | v1 완료 gate는 `flow:build`와 manual visual이며, Component Test가 계획에서 필수가 되면 추가한다 |

## 설치 후보 표

| 단계 | package 후보 | 메모 |
| --- | --- | --- |
| 필수 runtime | `react`, `react-dom`, `motion`, `lucide-react` | 앱 실행과 화면 표현에 필요 |
| 필수 dev | `vite`, `@vitejs/plugin-react`, `typescript` | Vite React TypeScript 앱 기반 |
| 조건부 test | `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` | Component Test를 completion gate로 잠글 때만 |
| 조건부 primitive | `radix-ui` 또는 개별 `@radix-ui/react-*` | native로 부족한 접근성 primitive가 필요할 때만 |
| 제외 | `three`, `@react-three/fiber`, `@xyflow/react`, `tailwindcss`, `@tailwindcss/vite`, `zustand`, `react-router` | 현재 잠긴 v1 방향에서는 불필요 |

## 남은 질문 / 가정

- 기본 가정: `flow/`는 repository root 바로 아래 폴더다.
- 기본 가정: 첫 버전은 설명형 웹사이트이며, 실제 runner 상태나 feedback 파일을 live로 읽지 않는다.
- 기본 가정: 대표 시나리오는 릴리즈 체크 보드 frontend service 작업이며, 실제 product repo 구현이 아니라 흐름 설명용 예시다.
- 기본 가정: v1은 `@xyflow/react` 같은 graph editor보다 custom CSS/SVG/HTML로 시나리오를 직접 보여주는 쪽을 선택한다.

## 추천 다음 상태

`ready_for_planning`
