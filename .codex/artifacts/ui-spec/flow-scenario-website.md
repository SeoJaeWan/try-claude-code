# flow 시나리오 웹사이트 UI 방향

artifact_status: superseded
artifact_path: ./.codex/artifacts/ui-spec/flow-scenario-website.md
request_scope_artifact: ./.codex/artifacts/brainstorm/flow-scenario-website.md
task_slug: flow-scenario-website
reference_decision_status: locked
superseded_by: ./.codex/artifacts/brainstorm/flow-scenario-experience-website.md
superseded_reason: planning docs R2에서 설명형 홈페이지 UI 방향이 목표와 어긋난 것으로 판정됨

## UI 방향 요약 표

| 대상 영역 | 이번에 고정한 방향 | 산출물 반영 메모 | 남은 미결정 |
| --- | --- | --- | --- |
| 전체 웹사이트 | `flow/` 안의 Vite React 단일 페이지 웹사이트. 하나의 릴리즈 체크 보드 frontend service 요청이 `brainstorm`부터 runner 종료까지 이동하는 과정을 설명한다 | 계획은 다중 route 앱이 아니라 single-page scenario website로 작성한다 | 없음 |
| 첫 화면 | 홍보형 landing이 아니라 시나리오 진입 화면. 요청 카드, 전체 여정 미니맵, 시작 버튼, 주요 산출물 요약을 첫 viewport에 둔다 | 첫 화면에서 `brainstorm → runner 종료` 여정이 보이게 한다 | 없음 |
| 중심 탐색 | desktop은 좌측 또는 상단의 12단계 spine을 고정 탐색으로 둔다. mobile은 chapter stack과 하단 이전/다음 control로 바꾼다 | 단계 선택이 중앙 설명과 artifact rail을 갱신해야 한다 | 없음 |
| 본문 설명 | 각 단계는 “무엇을 받고, 무엇을 만들고, 다음 단계가 왜 열리는지”를 보여주는 stage narrative로 표현한다 | 내부 taxonomy보다 입력/출력/다음 이동을 우선한다 | 없음 |
| artifact rail | `request-lock`, `plan.md`, `tdd.md`, `review.md`, planning docs package, `.runner-state.json`, dev-review data를 별도 rail로 보여준다 | artifact는 누가 만들고 누가 소비하는지를 반드시 표시한다 | 없음 |
| browser gate | planning docs와 dev-review를 다른 browser frame으로 표현한다 | planning docs는 계획 승인, dev-review는 구현 커밋 리뷰라는 라벨을 유지한다 | 없음 |
| branch 표현 | happy path는 중심 spine으로 두고 planning feedback, review blocked, rework, QA required는 접히는 side branch로 둔다 | 첫 진입에서는 branch가 흐름을 방해하지 않게 접어 둔다 | 없음 |

## 화면 구조 표

| 구역 | 배치 | 포함 콘텐츠 | 계획에 반영할 규칙 |
| --- | --- | --- | --- |
| Scenario hero | 상단 full-width band | 시나리오 요청 말풍선, `frontend-developer` badge, 여정 미니맵, 시작 button | hero text를 카드 안에 가두지 않는다. 단, 사용자 요청 자체는 말풍선/command card로 표현할 수 있다 |
| Flow spine | desktop 좌측 sticky 또는 상단 sticky, mobile chapter header | 12단계 label, 현재 단계, 완료/대기 상태, 간단한 icon | 단계 label은 짧게 유지하고 hover/focus 상태를 제공한다 |
| Stage narrative | 중앙 main column | 단계 제목, 핵심 설명, 입력, 출력, 다음 이동, 사용자 판단 포인트 | display type을 과하게 쓰지 않고 작업형 설명 밀도를 유지한다 |
| Artifact rail | desktop 우측 sticky, laptop/mobile 접힘 panel | 산출물 카드, 생성 주체, 소비 주체, path/command | 긴 path는 줄바꿈하고 overflow로 layout을 깨지 않는다 |
| Browser gate frame | planning docs/dev-review 단계 안의 넓은 visual block | sidebar, approve/comment marker, Submit, rework/QA 상태 | 실제 앱 screenshot처럼 오해되지 않게 “예시 frame” 라벨을 둔다 |
| Git/worktree diagram | runner 구간의 process block | base branch, worktree, task branch, commit stack, cleanup | main HEAD가 base에 남는 점을 branch line으로 분명히 표시한다 |
| Summary ending | 마지막 full-width band | artifact chain, 최종 선택 카드 3개, 다시 보기 button | merge/PR/later 중 하나를 자동 선택하는 UI처럼 보이면 안 된다 |

## 단계별 장면 표

| 순서 | 단계 | 화면 장면 | 사용자가 이해해야 할 것 |
| --- | --- | --- | --- |
| 1 | 사용자 요청 | 릴리즈 체크 보드 요청 말풍선과 아직 잠기지 않은 항목 chip | 처음 요청은 화면 범위, 상태, API hook, 검증 기준이 열려 있다 |
| 2 | `brainstorm` | 질문 chip이 결정 행으로 바뀌는 잠금 board | 바로 구현하지 않고 product/UI/test/execution boundary를 먼저 닫는다 |
| 3 | request-lock artifact | 문서 카드가 handoff arrow를 타고 planning 영역으로 이동 | durable artifact가 다음 단계의 입력이다 |
| 4 | `orchestrator` | control panel 안에서 plan wiki 확인과 role pass queue가 보임 | orchestrator가 cross-skill planning loop를 소유한다 |
| 5 | `plan-maker` | blueprint sheet에 화면 구조, API hook, 상태, 검증 단위가 정리됨 | `frontend-developer`가 실행 가능한 plan으로 바뀐다 |
| 6 | `plan-tdd` | red contract rack에 Component Test, selected E2E, manual visual smoke가 꽂힘 | 구현 전에 실패 가능한 검증 계약이 생긴다 |
| 7 | `plan-review` | cold review stamp와 blocked/ready loop | fresh review가 planning docs 전 필수 gate다 |
| 8 | planning docs | browser frame의 target list, approve checkbox, comment marker | 사용자는 구현 전 plan/TDD를 승인한다 |
| 9 | `/runner` 진입 | terminal strip과 `[runner-skill bootstrap]` receipt | hook은 path sanity만 하고 runner가 실행을 맡는다 |
| 10 | worktree + agent | base branch에서 worktree가 갈라지고 phase commit stack이 쌓임 | `frontend-developer`가 worktree에서 foreground로 실행된다 |
| 11 | dev-review | diff browser, line comment pin, rework/QA/approved branch | 구현 커밋은 별도 browser gate에서 검토된다 |
| 12 | runner 종료 | worktree cleanup, commit summary, merge/PR/later cards | 승인 뒤 최종 처리는 사용자 선택이다 |

## 상태/표현 규칙 표

| 상태 또는 상황 | 사용자가 보게 될 것 | 계획에 반영할 규칙 | 비고 |
| --- | --- | --- | --- |
| 첫 진입 | 시나리오 요청과 전체 여정이 동시에 보인다 | landing page처럼 긴 소개를 앞세우지 않는다 | 실제 첫 viewport에서 다음 section hint가 보여야 한다 |
| active step | spine node, narrative heading, artifact rail이 같은 단계 색으로 강조된다 | 선택 상태가 텍스트와 색 둘 다로 드러나야 한다 | keyboard focus 포함 |
| 이전/다음 이동 | 하단 또는 상단 control로 순차 이동한다 | mobile에서는 고정 하단 control을 허용하되 본문을 가리지 않는다 | label은 짧고 잘리지 않아야 한다 |
| artifact 선택 | drawer 또는 inline panel에 생성 주체, 소비 주체, path, 역할이 열린다 | artifact를 live file editor처럼 보이게 하지 않는다 | read-only 설명 |
| planning feedback branch | 중심 spine 옆에 작은 side branch가 펼쳐진다 | happy path와 feedback loop를 색/라인 스타일로 구분한다 | 기본은 접힘 |
| plan-review blocked | review stamp가 blocked로 바뀌고 plan-maker로 돌아가는 loop가 표시된다 | 막힘은 실패가 아니라 plan revision route로 설명한다 | optional branch |
| dev-review rework | diff comment가 rework dispatch card로 이어진다 | rework는 commit별 dispatch라는 점을 표현한다 | approved 전 종료 불가 |
| QA required | question marker가 chat answer와 browser re-submit으로 이어진다 | 질문 답변 뒤 같은 review gate로 돌아온다 | optional branch |
| final approved | commit stack이 approved stamp를 받고 cleanup으로 이동한다 | approved 전 merge/PR/later card를 활성처럼 보이지 않는다 | gate 의미 유지 |
| 좁은 화면 | 단계별 chapter stack으로 한 장면씩 보인다 | 가로 스크롤 의존 없이 path와 card가 줄바꿈된다 | mobile 우선 읽기 |

## 디자인 시스템/제약 표

| 항목 | 이번 결정 | 이유 | 적용 범위 |
| --- | --- | --- | --- |
| 시각 언어 | 2D editorial process website | 사용자가 흐름을 읽고 따라가는 것이 핵심이다 | 전체 |
| 톤 | 조용한 운영형 process map + 선명한 accent | 도구 흐름을 설명하므로 SaaS/ops 밀도에 가깝게 간다 | 전체 |
| 색상 | neutral base에 의미별 accent를 둔다: request, planning, approval, runner, review, done | 단계와 소유 영역을 빠르게 구분해야 한다 | spine, rail, branch, badges |
| 장식 | branch line, artifact envelope, terminal strip, browser frame, commit stack, approval stamp를 사용한다 | 실제 product screenshot 없이도 충분한 visual asset이 된다 | 주요 scene |
| 3D | Three.js, camera, 3D canvas를 쓰지 않는다 | 사용자가 3D 필요성을 낮췄고 흐름 이해를 방해할 수 있다 | 전체 |
| 카드 | 개별 artifact, decision, commit, final option에만 사용한다 | 카드 안 카드와 section-card 남발을 막는다 | 전체 |
| 아이콘 | `lucide-react` 의미 icon을 button/label 보조로 사용한다 | 직접 SVG를 늘리지 않고 인지 속도를 높인다 | spine, rail, control |
| 애니메이션 | active transition, edge drawing, branch expand/collapse, scroll progress에 제한한다 | 화려함은 흐름 이해를 돕는 정도로 둔다 | interaction |
| 접근성 | semantic heading, button, landmark, focus ring, 색 외 텍스트 상태 표시 | 색상만으로 상태를 전달하지 않는다 | 전체 |
| 문구 | 한국어 중심, path/command/package는 원문 유지 | 사용자 이해와 정확한 식별자를 모두 지킨다 | 전체 |

## UI 스타일 잠금 표

| 항목 | 스타일 방향 | 적용 규칙 | 피해야 할 것 |
| --- | --- | --- | --- |
| 전체 인상 | “작전 지도 같은 product workflow atlas”가 아니라 “운영형 editorial process site” | 넓은 여백, 정교한 선, 명확한 단계 색, 문서형 정보 밀도를 함께 사용한다 | 마케팅 landing page, 게임 UI, 3D dashboard |
| 배경 | 아주 밝은 warm gray 또는 neutral white base에 얇은 grid/dot texture를 낮은 opacity로 둔다 | texture는 flow line을 방해하지 않게 거의 보조 수준으로 둔다 | gradient orb, bokeh blob, 과한 dark slate 배경 |
| 표면 | 큰 section은 full-width band로 나누고, 개별 artifact/decision/commit만 card로 둔다 | card radius는 8px 이하, border는 얇게, shadow는 낮게 사용한다 | card 안 card, 떠 있는 section card |
| 색상 체계 | neutral base + 의미별 accent | request=ink/neutral, brainstorm=teal, planning=blue, approval=green, runner=amber, review=rose, done=purple가 아니라 muted violet 정도로 제한 | 단일 보라/파랑 theme, 강한 rainbow UI |
| 타이포 | UI 제목은 단단하고 짧게, 본문은 읽기 좋은 system sans | hero H1은 사이트 이름보다 시나리오 명을 크게 보여주고, stage heading은 compact하게 둔다 | viewport 기반 font-size, 음수 letter-spacing |
| 코드/경로 | terminal strip과 path badge에는 monospace를 사용한다 | 긴 path는 줄바꿈, `overflow-wrap:anywhere`, 작은 label과 함께 표시한다 | path가 카드 밖으로 삐져나오기 |
| 라인 | spine, handoff arrow, branch strip은 1.5px-2px 선과 rounded joint로 구성한다 | active path만 선명하고 inactive path는 낮은 대비로 둔다 | 모든 선이 같은 강도로 보여 흐름이 복잡해지는 것 |
| 아이콘 | lucide icon을 label 보조로 쓰고, icon-only button은 tooltip/aria-label을 둔다 | `GitBranch`, `FileText`, `Terminal`, `Monitor`, `CheckCircle`, `AlertTriangle` 같은 의미 아이콘을 사용한다 | 직접 그린 임의 SVG icon 남발 |
| 데이터 카드 | artifact card는 작은 title, producer, consumer, path, status pill을 가진다 | 한 카드 안에 설명을 많이 넣지 않고 선택 시 detail에서 확장한다 | 긴 설명이 카드 높이를 제각각 키우는 것 |
| 브라우저 프레임 | planning docs/dev-review는 실제 browser chrome을 단순화한 frame으로 표현한다 | frame 안에는 sidebar, main area, comment/approve marker만 추상화해서 둔다 | 실제 screenshot처럼 보이거나 기존 UI와 완전히 같은 척하기 |
| 터미널 프레임 | `/runner` command와 bootstrap receipt는 dark-on-light 또는 light terminal strip으로 표현한다 | command line은 한눈에 읽히게 하고 결과 receipt는 작은 paper slip처럼 둔다 | full terminal emulator처럼 과도하게 꾸미기 |
| 상태 pill | `ready`, `blocked`, `approved`, `rework`, `qa`, `done`을 작은 pill로 표시한다 | 색과 text label을 함께 둔다 | 색만으로 상태 전달 |
| 모션 | 선이 살짝 그려지고 active card가 부드럽게 떠오르는 정도 | 180-280ms transition, branch expand/collapse, scroll progress에 제한한다 | parallax, 과한 spring bounce, 눈에 피로한 loop animation |

## 색상/토큰 방향 표

| token 역할 | 권장 느낌 | 사용 위치 | 메모 |
| --- | --- | --- | --- |
| `--bg` | 거의 흰색에 가까운 neutral | page background | long reading에 피로가 적어야 한다 |
| `--surface` | 흰색 또는 아주 옅은 warm gray | cards, browser frame, panels | section 자체는 card화하지 않는다 |
| `--line` | 낮은 대비 gray | borders, separators, inactive line | 정보 구조만 잡는다 |
| `--text` | 짙은 neutral | heading/body | contrast 우선 |
| `--muted` | 중간 gray | metadata, producer/consumer label | path보다 낮은 위계 |
| `--accent-brainstorm` | muted teal | brainstorm stage, lock board | 결정 잠금 느낌 |
| `--accent-planning` | clear blue | orchestrator/plan-maker/TDD/review planning loop | planning 영역 통일 |
| `--accent-approval` | green | planning docs approved, final approved | 승인/통과 |
| `--accent-runner` | amber | `/runner`, state, worktree | 실행/작업 중 |
| `--accent-review` | rose/red | dev-review comments, rework | 검토/수정 필요 |
| `--accent-done` | restrained violet or ink | 종료 요약 | 과한 보라 theme가 되지 않게 제한 |

## 컴포넌트 스타일 표

| 컴포넌트 | 스타일 | 상태 |
| --- | --- | --- |
| Hero request card | 말풍선과 command card 사이의 형태. 왼쪽에 사용자 요청, 오른쪽에 journey mini-map | 시작 전, started |
| Flow spine node | 작은 number, icon, label, status pill을 가진 compact item | inactive, active, completed, branch-available |
| Stage narrative panel | card가 아니라 본문 section. 상단에 stage label, 제목, 짧은 설명, 아래에 input/output rows | normal, active |
| Artifact card | 얇은 border, 작은 file icon, producer/consumer chips, path badge | idle, selected, consumed |
| Browser gate frame | 단순 chrome bar + sidebar + main pane + comment/approval marker | in-progress, commented, approved |
| Branch strip | main spine 옆의 얇은 curved line과 작은 branch cards | collapsed, expanded |
| Commit stack | 겹치지 않는 vertical list. commit subject, phase badge, review status | pending, committed, needs-change, approved |
| Decision cards | 세 개의 동등한 선택지 카드 | merge, PR, later 모두 user-choice 상태 |

## 스타일 검증 기준 표

| 위험 | 확인할 기준 | 검증 방식 |
| --- | --- | --- |
| 한 색상 계열로 읽힘 | 전체 화면이 보라/파랑/어두운 slate 일색이면 수정한다 | CSS color scan + 수동 visual |
| 텍스트 넘침 | 긴 path와 command가 카드/버튼 밖으로 나가지 않는다 | desktop/mobile screenshot |
| 카드 남발 | section 전체가 floating card처럼 보이지 않는다 | 수동 visual review |
| gate 혼동 | planning docs와 dev-review가 같은 browser처럼 보여도 목적 label이 분명하다 | 수동 visual review |
| 모션 과잉 | 애니메이션이 정보 전환을 돕고 반복적으로 주의를 빼앗지 않는다 | dev server 수동 확인 |

## 체험 산출물 분해 표

| 산출물 종류 | 대상 단위 | 대상 수 | 검토자가 볼 것 | 계획에 반영할 규칙 |
| --- | --- | --- | --- | --- |
| `shell-preview` | 전체 `flow/` 웹사이트 shell | 1 | hero, spine, narrative, artifact rail, responsive shell | planning docs가 전체 정보 구조를 검토할 수 있게 한다 |
| `screen-preview` | 시작 화면, planning 구간, runner 구간, 종료 요약 | 4 | 각 주요 chapter의 hierarchy와 visual density | 모든 preview는 실제 구현이 아니라 판단 자료임을 명시한다 |
| `component-preview` | Flow spine, Artifact rail, Browser gate frame, Git/worktree diagram, Branch strip, Decision cards | 6 | 핵심 UI component의 상태와 배치 | component별 입력 데이터와 상태 표현 규칙을 plan에 둔다 |
| `state-variant-preview` | active step, branch expanded, mobile chapter, final approved | 4 | interaction state가 정보를 어떻게 바꾸는지 | active/focus/expanded 상태를 누락하지 않는다 |
| `function-contract` | scenario data model | 1 | step, artifact, branch, lane data가 UI에 매핑되는 규칙 | schema/adapter가 필요하면 visual-only preview로 대체하지 않는다 |

## 반응형 규칙 표

| viewport | 배치 규칙 | 우선순위 | 금지 또는 주의 |
| --- | --- | --- | --- |
| desktop wide | 좌측 spine, 중앙 narrative, 우측 artifact rail의 3영역 구성 | 관계를 한눈에 보여준다 | section 전체를 floating card로 만들지 않는다 |
| laptop | 상단 compact progress와 접히는 artifact panel | 읽기 흐름과 단계 이동을 유지한다 | sticky header가 narrative 제목을 가리지 않는다 |
| mobile | 한 단계씩 chapter stack, 하단 이전/다음, 접히는 artifact drawer | 단계별 이해를 우선한다 | 가로 스크롤에 의존하지 않는다 |

## locked_ui_direction packet

| 항목 | 잠긴 내용 |
| --- | --- |
| 대상 journey | 릴리즈 체크 보드 frontend service 요청이 `brainstorm`에서 runner 종료까지 이동하는 단일 시나리오 |
| hierarchy | hero에서 전체 여정을 보여주고, 이후 12단계 spine이 narrative와 artifact rail을 제어한다 |
| emphasis | “산출물이 다음 단계의 입장권이 된다”는 흐름을 artifact rail과 handoff arrow로 강조한다 |
| state expectations | active step, artifact selected, branch expanded, browser gate approved/commented, final decision states를 모두 표현한다 |
| responsive | desktop 3영역, laptop compact progress, mobile chapter stack으로 고정한다 |
| accessibility | semantic structure, keyboard step navigation, visible focus, text state labels를 요구한다 |
| preview evidence | shell 1개, screen 4개, component 6개, state variant 4개, function-contract 1개를 planning docs 검토 기준으로 둔다 |
| 제외 | 3D, live runner dashboard, plugin runner 코드 변경, planning docs/dev-review UI 통합 |

## 남은 질문 / 가정

- 남은 blocking UI 질문 없음.
- 기본 가정: 첫 버전은 설명형 single-page website이며 실제 runner state나 feedback file을 live로 읽지 않는다.
- 기본 가정: visual preview는 planning docs 검토 자료이지 실제 frontend service 구현 결과물처럼 표현하지 않는다.

## 추천 다음 상태

locked_ui_direction
