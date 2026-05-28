# try-claude-code

Claude Code용 실행 플러그인과 Codex용 planning stack을 함께 실험하는 저장소입니다.

핵심 질문은 "어떤 규칙을 플러그인, 스킬, 리뷰 아티팩트로 분리해야 적은 문맥으로도 같은 결과를 안정적으로 재현할 수 있는가"입니다. 완성된 제품이라기보다 워크플로를 계속 분해하고 다시 조립해 보는 작업대에 가깝습니다.

## 최근 커밋 기준으로 반영된 변화

- planning 흐름이 예전 named planning agent 중심에서, generic skill sub-agent + artifact-driven orchestrator 중심으로 이동했습니다.
- `brainstorm -> ui-spec -> architect -> plan-tdd -> plan-review -> planning docs` 루프가 현재 기본 planning 경로입니다.
- planning docs gate와 feedback triage가 추가되어, 승인/수정 이력이 `plans/{task}/planning-docs/` 아래 아티팩트로 남습니다.
- 구현 완료 후에는 `runner`가 `dev-review`를 호출해 commit 기반 구현 리뷰를 수행합니다. 이 리뷰의 아티팩트는 `plans/{task}/dev-review/`에 데이터만 저장하고, HTML/UI는 플러그인 내부에서 직접 서빙합니다.
- `dev-review`는 `http://localhost:9797/review/{task}` 형태의 multi-review 서버를 재사용하며, commit step에서는 지원 가능한 앱에 대해 live preview iframe과 commit별 route override를 제공합니다.
- plan wiki는 project-local source clone인 `./.codex/plan-wiki/source`로 관리되고, planning root는 `./.codex/plan-wiki/source/wiki`를 기준으로 잡습니다.

## 현재 저장소 구조

```text
.claude-plugin/marketplace.json      # Claude Code 로컬 marketplace 엔트리
.agents/plugins/marketplace.json     # Codex 측 plugin marketplace 엔트리
.codex/
  skills/                            # planning stack
  tools/                             # planning review / plan wiki docs 등 Codex 보조 도구
  plan-wiki/                       # 외부 plan wiki를 가리키는 workspace link
plugin/
  develop/                           # 메인 Claude Code 개발 플러그인
  statusline/                        # 상태줄 전용 플러그인
docs/
  claude-code-workflow-evolution.md  # 워크플로 진화 기록
scripts/                             # workspace/운영 보조 스크립트
```

실행 중 생성되는 planning/review 산출물은 보통 `plans/{task}/` 아래에 만들어집니다. 이 디렉터리는 작업별 아티팩트라 항상 저장소에 고정되어 있지는 않습니다.

## 플러그인 구성

| 플러그인 | 경로 | 역할 |
|---|---|---|
| `try-claude-code` | `plugin/develop` | worktree 기반 실행, 훅, stop-review gate, dev-review, 개발/문서/검증 스킬 |
| `try-claude-code-statusline` | `plugin/statusline` | 상태줄 bootstrap, 동기화, on/off, inline/box 전환 |

### `plugin/develop`

현재 메인 실행 플러그인은 `2.5.0` 기준으로 아래 범주를 갖습니다.

- 실행 오케스트레이션: `runner`, `session-restore`
- 개발 도메인: `frontend-dev`, `backend-dev`, `general-dev`
- 검증/리뷰: `dev-review`
- 작업 마감: `commit`, `pr`, `doc`

여기에 대응하는 실행 agent도 같이 포함됩니다.

- `frontend-developer`
- `backend-developer`
- `general-developer`
- `doc-updater`

훅은 `plugin/develop/hooks/hooks.json`에 정의되어 있으며, 현재 다음 이벤트를 사용합니다.

- `SessionStart` / `SessionEnd`: 세션 라이프사이클과 Codex 가용성 추적
- `PostToolUse`: worktree 및 agent 사용 추적
- `Stop`: stop-review gate 실행

### `plugin/statusline`

상태줄은 이제 별도 플러그인입니다. 예전 `/init-statusline` 문서 대신 아래 식의 트리거를 기준으로 동작합니다.

- `statusline`
- `statusline on`
- `statusline off`
- `statusline inline`
- `statusline box`
- `상태줄`, `상태줄 켜기`, `상태줄 끄기`

SessionStart 훅이 `~/.claude/statusline/` 아래 파일을 자동 동기화하고, skill이 bootstrap과 모드 전환을 맡습니다.

## Codex planning stack

`.codex/skills/` 아래에는 현재 planning stack이 로컬 디렉터리 기준으로 들어 있습니다.

| 스킬 | 역할 |
|---|---|
| `brainstorm` | 요청의 목표, 범위, public surface, 제외 범위를 먼저 잠그는 entrypoint |
| `ui-spec` | UI 방향이 불명확할 때 화면/상태/반응형 방향을 먼저 고정 |
| `architect` | 실행 가능한 `plan.md`와 phase detail 아티팩트를 작성 |
| `plan-review` | 계획 아티팩트만 읽고 cold review 수행 |
| `orchestrator` | stateless, artifact-driven planning loop 전체를 조율 |
| `plan-tdd` | 계획에서 실제 source-tree TDD contract test를 작성 |
| `plan-wiki-setup` | 외부 plan wiki source clone과 planning root 준비 |
| `plan-wiki-lint` | plan wiki 품질 점검 |
| `plan-wiki-ingest` | 수집된 리뷰를 plan wiki 지식으로 흡수 |

현재 orchestrator의 핵심은 다음과 같습니다.

- hidden state보다 `plan.md`, `tdd.md`, `review.md`, `planning-docs/*` 같은 아티팩트를 source of truth로 사용
- browser 기반 planning docs approval을 강제하고, 승인되지 않은 피드백은 triage 후 다음 planning 단계로 되돌림
- `.codex/tools/planning-docs-browser-server.mjs`로 planning docs UI를 서빙
- planning 하위 역할은 named agent 고정보다 skill-driven sub-agent 재사용 쪽으로 정리

## 구현 리뷰와 live preview

`dev-review`는 planning review가 아니라 구현 리뷰입니다. `runner`가 모든 phase commit을 끝낸 뒤 merge/PR/later 결정을 내리기 전에 실행합니다.

- 리뷰 데이터: `plans/{task}/dev-review/review-data.json`, `feedback.json`, `review-history.json`, `assets/diffs/*`
- 리뷰 UI: `plugin/develop/skills/dev-review/assets/index.html`에서 직접 서빙
- 서버: `plugin/develop/skills/dev-review/scripts/server.mjs`
- URL: `http://localhost:9797/review/{task_slug}`

서버는 한 프로세스가 여러 task review를 동시에 호스팅합니다. commit step에서는 변경 파일을 기준으로 앱 package를 탐지하고, `scripts.dev`가 있으면 별도 포트에 dev server를 lazy spawn해 오른쪽 iframe에 표시합니다. reviewer가 commit별 route를 직접 바꾸면 `feedback.json.preview_routes`에 저장되어 같은 round에서 다시 열 때 유지됩니다.

## 현재 워크플로 감각

대략적인 흐름은 아래와 같습니다.

1. 복잡한 요청은 request-scope 또는 UI direction 선결정을 잠급니다.
2. `architect`가 실행 가능한 계획 아티팩트를 `plans/{task}/`에 씁니다.
3. `plan-tdd`가 실제 테스트 파일을 소스 트리에 생성하고 plan row/test/manual smoke 매핑을 남깁니다.
4. `plan-review`가 현재 `plan.md`와 `tdd.md`를 함께 cold review합니다.
5. `orchestrator`가 planning docs gate와 feedback triage를 관리합니다.
6. 구현 실행은 `plugin/develop`의 `runner`가 task 단위 worktree에서 수행하고, phase별 commit을 만듭니다.
7. `runner`가 `dev-review`를 열어 commit card, diff, live preview 기반 구현 리뷰를 받고, `needs-change` 피드백은 같은 worktree에서 재작업 라운드로 돌립니다.
8. 구현 리뷰가 승인된 뒤 stop-review gate와 merge/PR/later 결정을 거칩니다.

세션이 중간에 끊겨도 `session-restore`가 기존 git worktree를 현재 세션에 다시 등록할 수 있습니다.

## 플랫폼 요구사항

### 공통

- Node.js 20 이상
- Git 2.20 이상
- Codex CLI 설치는 선택 사항이지만, stop-review gate와 일부 planning 흐름에서는 있으면 더 좋습니다.

### Windows

- worktree 경로가 길어질 수 있으므로 필요하면 한 번만 아래를 설정합니다.

```powershell
git config --global core.longpaths true
```

- Git Bash 환경이 쉘 호환성 면에서 가장 안정적이지만, 주요 파일 복사/동기화는 Node 헬퍼로 우회하도록 유지하고 있습니다.
- 최근 실행 스크립트는 shell 문자열 기반 spawn을 줄이고 Node `spawn`/`fs` helper를 우선 사용하도록 정리되어 Windows quoting 문제를 더 적게 탑니다.

### Linux / macOS

- npm 전역 bin 경로가 PATH에 포함되어 있어야 Codex CLI 탐지가 안정적입니다.

## 테스트

루트 `package.json`에는 현재 최소한의 검증만 남겨 두었습니다.

```bash
npm test
```

이 명령은 hook contract 테스트를 실행합니다. CI의 [plugin-test.yml](./.github/workflows/plugin-test.yml)은 여기에 더해 아래 smoke test도 함께 돌립니다.

- `plugin/develop/scripts/session-lifecycle-hook.mjs`의 SessionStart Codex probe

매트릭스는 `ubuntu / macOS / windows x Node 20, 22`입니다.

## 문서

가장 먼저 볼 문서는 아래 하나면 충분합니다.

- [`docs/claude-code-workflow-evolution.md`](./docs/claude-code-workflow-evolution.md) - 이 저장소가 어떤 단계를 거쳐 현재 구조까지 왔는지 정리한 문서
