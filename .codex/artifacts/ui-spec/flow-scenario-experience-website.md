# flow 시나리오 체험 사이트 UI 방향

artifact_status: locked_ui_direction
artifact_path: ./.codex/artifacts/ui-spec/flow-scenario-experience-website.md
request_scope_artifact: ./.codex/artifacts/brainstorm/flow-scenario-experience-website.md
task_slug: flow-scenario-experience-website
reference_decision_status: locked
supersedes: ./.codex/artifacts/ui-spec/flow-scenario-website.md

## UI 방향 요약 표

| 대상 영역 | 이번에 고정한 방향 | 산출물 반영 메모 | 남은 미결정 |
| --- | --- | --- | --- |
| 전체 제품 성격 | 설명형 홈페이지가 아니라 하나의 요청을 직접 진행해보는 운영형 시뮬레이터로 만든다 | 첫 화면부터 사용자가 시나리오 안에 들어온 상태여야 한다 | 없음 |
| 대표 시나리오 | “릴리즈 체크 보드 프론트 서비스를 만든다”라는 하나의 요청이 `brainstorm`부터 plugin `runner` 종료까지 이어진다 | 단계마다 입력, 사용자 판단, 생성 산출물, 다음 수신자를 함께 보여준다 | 없음 |
| 첫 화면 | 첫 소개 화면이 아니라 진행 대기 중인 요청, 현재 목표, 다음 행동, 전체 진행 레일이 보인다 | 시작 버튼은 “읽기 시작”이 아니라 “결정 잠금 시작”처럼 시나리오 행동으로 보이게 한다 | 없음 |
| 핵심 화면 문법 | 좌측 진행 레일, 중앙 현재 장면, 우측 산출물 서랍을 기본 구조로 둔다 | 사용자가 행동하면 단계 상태와 산출물 잠금이 함께 바뀐다 | 없음 |
| 체험 방식 | 단계 설명을 스크롤로 읽는 것이 아니라 사용자가 승인, 반려, 재검토, 전달 같은 행동을 눌러 흐름을 전진시킨다 | 자동 진행보다 사용자의 판단 순간을 강조한다 | 없음 |
| 분기 표현 | 기본 흐름은 한 줄로 유지하고, 계획 피드백, plan review 막힘, dev-review 재작업, QA 필요 상황은 열린 분기로 체험한다 | 분기는 실패가 아니라 같은 흐름으로 돌아오는 경로로 표현한다 | 없음 |
| 종료 장면 | runner 종료 뒤 `merge`, `PR`, `later` 중 하나를 사용자가 선택하는 장면으로 끝난다 | 승인 전에는 종료 선택지가 활성처럼 보이면 안 된다 | 없음 |

## 화면 전환 흐름 표

| 순서 | 장면 | 사용자가 보는 것 | 주요 행동 | 다음에 열리는 것 |
| --- | --- | --- | --- | --- |
| 1 | 요청 도착 | “릴리즈 체크 보드 프론트 서비스” 요청 카드, 아직 열린 결정 칩, 전체 진행 레일 | `brainstorm` 시작 | 결정 잠금 보드 |
| 2 | `brainstorm` | 화면 범위, 상태, 검증, 실행 경계가 하나씩 잠기는 보드 | 결정 잠금 | request-lock 산출물 |
| 3 | request-lock 인계 | 잠긴 요청 문서가 planning 쪽으로 이동하는 인계 장면 | 계획으로 넘기기 | orchestrator 관제 패널 |
| 4 | orchestrator | plan wiki 확인, `plan-maker`, `plan-tdd`, `plan-review` 대기열 | 계획 루프 실행 | 실행 계획 초안 |
| 5 | `plan-maker` | 화면 구조, 상태 모델, 검증 단위가 설계도처럼 정리된다 | 계획 검토로 넘기기 | TDD 계약 |
| 6 | `plan-tdd` | 실패해야 하는 테스트 계약, 수동 시각 검증 항목, 제외 범위가 묶인다 | 테스트 계약 고정 | 독립 검토 |
| 7 | `plan-review` | blocked 또는 ready 판정, 수정 루프 화살표 | ready로 승인 또는 수정 반영 | planning docs 검토 관문 |
| 8 | planning docs 검토 관문 | browser형 검토 화면, 승인 checkbox, 댓글 표시 | 승인 제출 또는 피드백 남기기 | runner 전달 또는 planning 루프 복귀 |
| 9 | `/runner` 전달 | 명령 줄, worktree 생성, 실행 agent 배정 | runner 시작 | 구현 진행판 |
| 10 | 구현 진행 | phase별 commit 묶음, 변경 파일 묶음, 검증 상태 | dev-review 요청 | review 검토 관문 |
| 11 | dev-review 검토 관문 | diff 화면, line comment, rework, QA, approved 상태 | 재작업 지시 또는 승인 | runner 종료 준비 |
| 12 | runner 종료 | 정리된 worktree, commit 요약, `merge`/`PR`/`later` 선택지 | 최종 선택 | 완료 기록판 |

## 상태/표현 규칙 표

| 상태 또는 상황 | 사용자가 보게 될 것 | 계획에 반영할 규칙 | 비고 |
| --- | --- | --- | --- |
| 첫 진입 | 현재 요청, 현재 목표, 다음 행동 버튼, 전체 단계 레일이 한 화면에 보인다 | 긴 소개문이나 홍보형 첫 화면으로 시작하지 않는다 | 첫 viewport에서 바로 체험이 시작되어야 한다 |
| 진행 전 단계 | 회색 레일과 잠금 표시, “아직 이전 산출물이 필요함” 문구 | 단순 숨김보다 왜 대기 중인지 보여준다 | 색만으로 잠금을 표현하지 않는다 |
| 현재 단계 | 레일, 중앙 제목, 우측 산출물 서랍이 같은 단계 상태를 공유한다 | active 상태는 텍스트와 시각 강조가 함께 있어야 한다 | 키보드 focus와 별개로 보여야 한다 |
| 사용자 행동 가능 | 중앙 하단에 하나의 주요 행동과 필요한 보조 행동만 둔다 | 한 단계에서 여러 주요 버튼이 경쟁하지 않게 한다 | 보조 행동은 낮은 위계의 버튼으로 둔다 |
| 산출물 잠금 해제 | 새 산출물 카드가 우측 서랍에 추가되고 수신자 화살표가 표시된다 | 산출물은 생성 주체, 소비 주체, 경로, 역할을 가진다 | 실제 파일 편집기처럼 보이면 안 된다 |
| planning feedback | browser형 검토 관문 안 댓글 표시가 열리고 진행 레일이 planning 루프로 되돌아간다 | 피드백은 막힘이 아니라 재계획 경로로 표현한다 | 사용자 댓글은 짧은 예시로 둔다 |
| plan review blocked | blocked 판정 도장과 수정 대상 checklist가 보인다 | blocked 뒤에는 `plan-maker`로 돌아가는 상태 전환이 있어야 한다 | 자동 통과 금지 |
| runner 실행 중 | 터미널 줄, worktree lane, commit 묶음이 순서대로 채워진다 | 실제 runner 상태를 읽지 않고 정적 시나리오 상태로 표현한다 | 실행 로그 과시보다 진행 의미 우선 |
| dev-review rework | diff comment가 rework card로 바뀌고 구현 단계로 되돌아간다 | 승인 전에는 최종 선택지를 닫아 둔다 | QA required도 같은 검토 관문 안 분기로 둔다 |
| 승인 완료 | approved 판정 도장, cleanup 표시, 최종 선택 카드가 활성화된다 | `merge`, `PR`, `later`는 사용자가 고르는 선택지로 둔다 | 자동 완료처럼 보이지 않게 한다 |
| mobile | 한 번에 한 장면과 산출물 drawer만 열린다 | 가로 스크롤 없이 경로와 명령이 줄바꿈된다 | 하단 고정 행동 영역이 본문을 가리지 않아야 한다 |

## 핵심 컴포넌트 표

| 컴포넌트 | 역할 | 상태 | 구현 메모 |
| --- | --- | --- | --- |
| 진행 레일 | 전체 단계와 현재 위치를 보여준다 | locked, active, completed, branch-active | desktop은 좌측 고정, mobile은 상단 축약 progress |
| 현재 목표 패널 | 지금 사용자가 판단해야 할 일을 보여준다 | idle, actionable, waiting, resolved | 주요 행동은 단계마다 하나로 제한한다 |
| 산출물 서랍 | 생성된 문서와 수신자를 보여준다 | locked, newly-unlocked, selected, consumed | 긴 경로는 `overflow-wrap:anywhere` 기준 |
| 검토 관문 시뮬레이터 | planning docs와 dev-review의 승인/피드백 장면을 보여준다 | reviewing, commented, blocked, approved | 두 검토 관문은 라벨과 색으로 목적을 분리한다 |
| 분기 패널 | feedback, blocked, rework, QA required를 체험한다 | collapsed, open, returning | 기본 흐름을 가리지 않는 보조 흐름으로 둔다 |
| worktree 보드 | runner가 branch와 commit을 어떻게 다루는지 보여준다 | pending, running, committed, cleaned | 실제 git 명령 실행처럼 오해되지 않게 예시 표기를 둔다 |
| 완료 기록판 | 마지막 산출물, 검증, 사용자 선택을 묶는다 | waiting, selectable, selected | 승인 전 비활성 상태를 명확히 둔다 |

## 디자인 시스템/제약 표

| 항목 | 이번 결정 | 이유 | 적용 범위 |
| --- | --- | --- | --- |
| 시각 언어 | 운영형 시뮬레이터, 업무용 관제 화면, 문서형 증거 패널을 섞는다 | 사용자가 flow를 “읽는” 것이 아니라 “진행하는” 느낌이 필요하다 | 전체 `flow/` 앱 |
| 밀도 | 정보는 조밀하지만 한 단계에서 볼 행동은 적게 둔다 | 복잡한 개발 flow를 과장 없이 따라가게 해야 한다 | 중앙 현재 장면, 진행 레일 |
| 색상 | 중립 바탕에 단계 의미별 강조 색을 둔다 | 흐름 구분은 빠르게, 전체 인상은 차분하게 유지한다 | 레일, 상태 pill, 검토 관문, 분기 |
| 장식 | 선, 판정 도장, browser frame, 터미널 줄, commit 묶음, 잠금 해제 motion만 사용한다 | 화려함은 정보 전환을 돕는 수준으로 제한한다 | 핵심 장면 |
| 금지 방향 | 설명형 홈페이지, 정적 timeline, 3D 장면, live runner dashboard, 게임형 UI는 제외한다 | 최신 피드백이 체험형 목표를 다시 고정했다 | 전체 |
| 카드 사용 | 개별 산출물, 선택지, commit, 검토 관문 표시자에만 카드 사용 | section 전체를 떠 있는 카드로 만들지 않는다 | 레이아웃 전반 |
| 아이콘 | `lucide-react` 아이콘을 button, status, 단계 보조에 사용한다 | 직접 그린 장식보다 익숙한 도구 언어가 적합하다 | 버튼, 레일, 산출물 |
| 접근성 | button, heading, landmark, `aria-current`, `aria-expanded`, visible focus를 사용한다 | 시나리오 진행이 키보드와 스크린 리더로도 이해되어야 한다 | 전체 |
| 문구 | 한국어 우선, 경로와 명령, 패키지 이름만 원문 유지 | flow 이해를 사람 말로 유지하면서 식별자는 정확히 보존한다 | 사용자에게 보이는 문구 |

## 체험 산출물 분해 표

| 산출물 종류 | 대상 단위 | 대상 수 | 검토자가 볼 것 | 계획에 반영할 규칙 |
| --- | --- | --- | --- | --- |
| `shell-preview` | 운영형 시뮬레이터 전체 shell | 1 | 진행 레일, 현재 목표, 산출물 서랍, 검토 관문 영역이 한 화면에서 어떻게 결합되는지 | 홈페이지 첫 화면이 아니라 진행 중인 작업 화면으로 검토한다 |
| `screen-preview` | 요청 도착, planning gate, runner 전달, dev-review rework, runner 종료 | 5 | 하나의 사건이 단계별 행동으로 이어지는지 | 각 화면은 다음 행동과 unlock 결과를 같이 보여야 한다 |
| `component-preview` | 진행 레일, 현재 목표 패널, 산출물 서랍, 검토 관문 시뮬레이터, 분기 패널, worktree 보드, 완료 기록판 | 7 | 핵심 컴포넌트의 상태, 밀도, 배치 | 컴포넌트별 상태 입력과 표시 규칙을 계획에 둔다 |
| `state-variant-preview` | action 전, 산출물 unlock 직후, gate comment, branch-active, rework 복귀, mobile action focus | 6 | 진행 상태가 UI를 어떻게 바꾸는지 | 상태 변화 없는 정적 preview만으로 승인받지 않는다 |
| `function-contract` | 시나리오 상태 reducer와 행동 매핑 | 1 | 사용자 행동이 단계, 산출물, 분기, 완료 선택으로 변환되는 규칙 | visual-only 구현이 아니라 상태 전환 계약을 테스트 가능하게 둔다 |

## 반응형 규칙 표

| viewport | 배치 규칙 | 우선순위 | 금지 또는 주의 |
| --- | --- | --- | --- |
| desktop wide | 좌측 진행 레일, 중앙 현재 장면, 우측 산출물 서랍의 3영역 구성 | 관계와 진행 상태를 한눈에 보여준다 | 중첩 card 레이아웃 금지 |
| laptop | 상단 축약 progress와 우측 접힘 서랍 | 현재 행동과 산출물 확인을 유지한다 | 고정 요소가 제목과 button을 가리면 안 된다 |
| mobile | 한 단계씩 읽는 장면 화면, 상단 progress, 하단 행동 영역, 접힘 산출물 서랍 | 지금 할 일 하나를 분명하게 보여준다 | 가로 스크롤 의존 금지 |

## locked_ui_direction packet

| 항목 | 잠긴 내용 |
| --- | --- |
| 대상 여정 | 릴리즈 체크 보드 프론트 서비스 요청이 `brainstorm`부터 plugin `runner` 종료까지 이어지는 단일 시나리오 |
| 정보 위계 | 전체 소개보다 현재 요청, 현재 목표, 다음 행동, 산출물 unlock, 검토 관문 분기를 우선한다 |
| 강조점 | “사용자의 판단이 다음 산출물을 열고 다음 실행 주체로 넘긴다”는 체험을 중심에 둔다 |
| 상태 기대치 | locked, active, completed, newly-unlocked, branch-active, commented, blocked, approved, selected 상태를 표현한다 |
| 반응형 | desktop 3영역, laptop 축약 progress, mobile 행동 우선 장면으로 고정한다 |
| 접근성 | keyboard action, visible focus, `aria-current`, `aria-expanded`, text state label을 요구한다 |
| 검토 증거 | shell 1개, screen 5개, component 7개, state variant 6개, function contract 1개를 planning docs 검토 기준으로 둔다 |
| 제외 | 설명형 홈페이지, 정적 timeline, 3D, live runner dashboard, plugin runner 코드 변경 |

## 남은 질문 / 가정

- blocking UI 질문 없음.
- 기본 가정: 대표 시나리오는 “릴리즈 체크 보드 프론트 서비스를 만든다”를 사용한다.
- 기본 가정: `flow/` 앱은 실제 runner, planning docs, dev-review 파일을 live로 읽지 않고 정적 시나리오 데이터와 앱 내부 상태로 체험을 만든다.

## 추천 다음 상태

locked_ui_direction
