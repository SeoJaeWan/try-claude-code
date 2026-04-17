# try-claude-code

Claude Code 스킬, 에이전트, 플러그인, 워크플로를 실험하는 저장소입니다.

완성된 제품이라기보다는, "어떤 구조가 더 적은 문맥으로도 안정적으로 같은 결과를 내는가"를 계속 확인해보는 작업대에 가깝습니다.

## 어떤 걸 실험하나요?

- 계획 스킬(`.codex/skills`)로 요청을 분해하고, named planning agent(`.codex/agents`)로 cold review와 test materialization을 분리한 뒤 실행 스킬(`plugin/skills`)로 구현하는 흐름
- 에이전트(`plugin/agents`)를 통한 역할 분리 — frontend, backend, general, doc, e2e test
- Hook 시스템(`plugin/hooks`)으로 세션 라이프사이클과 리뷰 게이트 자동화
- Status line(`plugin/statusline/`)으로 모델·비용·캐시·Git·외부 서비스 상태를 터미널에 통합

## 프로젝트 구성

```
.codex/skills/        # 계획·설계 스킬 (외부 vault symlink)
.codex/agents/        # Codex agent 정의 (외부 vault symlink, planning/execution 공존)
plugin/
  skills/             # 실행 스킬 11개
  agents/             # 에이전트 5개
  hooks/              # 세션·리뷰 훅
  scripts/            # 훅 실행 스크립트
  prompts/            # 프롬프트 템플릿
  statusline/         # 멀티라인 박스 UI 상태줄
components/           # 공용 UI 컴포넌트
plans/                # 작업 계획 아카이브
docs/                 # 설계 메모와 진화 기록
scripts/              # workspace sync 스크립트
```

## 스킬 목록

### 실행 스킬 (`plugin/skills/`)

| 스킬 | 설명 |
|---|---|
| `commit` | Conventional Commits 규칙으로 커밋 |
| `pr` | GitHub Pull Request 생성 |
| `frontend-dev` | React/Next.js/Expo 프론트엔드 개발 |
| `backend-dev` | API·DB·인증 백엔드 개발 (프레임워크 자동 감지) |
| `general-dev` | Docker, CI/CD, nginx 등 인프라/DevOps |
| `planner-lite` | worktree 격리 + 단계별 승인 기반 계획 실행 |
| `guard-e2e-test` | 다중 라우트 관통 full-flow Playwright E2E 테스트 |
| `doc-update` | CODEMAPS/HUMANMAPS 자동 생성 |
| `init-memory` | 외부 vault(Obsidian, Google Drive 등)로 메모리 symlink |
| `init-statusline` | 멀티라인 상태줄 초기 설정 (파일 복사 + settings.json 등록) |

### 계획 스킬 (`.codex/skills/`)

외부 vault(Google Drive)에서 symlink로 공유됩니다. `architect`, `brainstorm`, `plan-review`, `plan-materialize` 등.

`.codex/agents/`에는 `planner`, `plan-reviewer`, `plan-materializer` 같은 Codex named agent와 execution agent TOML이 함께 위치할 수 있습니다.

## 에이전트 (`plugin/agents/`)

| 에이전트 | 역할 |
|---|---|
| `frontend-developer` | React/Next.js 프론트엔드 전문 |
| `backend-developer` | API·DB 백엔드 전문 |
| `general-developer` | 인프라·DevOps 전문 |
| `doc-updater` | CODEMAP/HUMANMAP 문서 생성 |
| `playwright-guard` | full-flow E2E 테스트 전문 |

## Status Line (`plugin/statusline/`)

터미널 하단에 멀티라인 박스 UI 대시보드를 표시합니다.

```
┌─ CORE ──────────────────────┬─ SUPPLY ──────────────────────┐
│ opus-4-6[1m]   ⏱ 8m 41s     │ CTX 11%   ~$1.90             │
│ week 3%   session 22%       │ 캐시 110kr 488w  적중 99%     │
├─ GIT ───────────────────────┼─ PLUGIN ──────────────────────┤
│ main | task-A               │ gmail 7                       │
└─────────────────────────────┴───────────────────────────────┘
```

| 섹션 | 표시 항목 |
|------|----------|
| CORE | 모델명, 세션 시간, week/session 사용률 |
| SUPPLY | 컨텍스트 사용률, 비용, 캐시 토큰, 적중률 |
| GIT | 현재 브랜치, worktree 브랜치 |
| PLUGIN | Gmail 미읽음 수 (향후 tasks, jira 등 확장) |

### 설치

```bash
# 플러그인 설치 후
/init-statusline
```

`/init-statusline`이 `~/.claude/statusline/`에 파일을 복사하고 `settings.json`에 커맨드를 등록합니다. 이후 세션부터는 SessionStart 훅이 자동으로 파일을 동기화합니다.

## 방향

[`docs/claude-code-workflow-evolution.md`](./docs/claude-code-workflow-evolution.md)를 기준으로, 이 저장소는 대체로 아래 방향으로 움직이고 있습니다.

1. "문서를 읽고 기억해서 구현"보다 **계획 스킬 → 실행 스킬 → 에이전트**로 책임을 나누는 쪽
2. 에이전트가 코드베이스에서 직접 컨벤션을 발견하는 쪽 (CLI scaffold 불필요)
3. 한 레포 안의 개인 운영체계보다 **설치 가능한 plugin** 조합으로 분리하는 쪽
4. 큰 공통 문서를 매번 다 읽는 구조보다, **작업별 working set을 줄이는** 쪽

## 플랫폼 요구사항

이 플러그인은 macOS, Windows, Linux 모두에서 동작하도록 설계되어 있습니다. 다만 각 플랫폼에서 한 번은 확인해야 하는 사전 조건이 있습니다.

### 공통

- **Node.js 20 이상** — hook 스크립트와 `plan-copy.mjs` 헬퍼는 Node `fs.cpSync`(20+)를 사용합니다.
- **Git 2.20 이상** — worktree 명령을 쓰며, `git worktree list --porcelain` 출력 포맷에 의존합니다.
- **Codex CLI (선택)** — `stop-review-gate` 훅이 Codex를 호출합니다. 미설치 상태에서도 세션은 정상 동작하며, stop 리뷰만 자동으로 건너뜁니다. SessionStart 훅이 세션 시작 시 Codex 감지 여부를 stderr에 알려줍니다.
  ```
  npm install -g @openai/codex
  ```

### Windows

- **긴 경로 지원**: worktree 디렉토리 이름이 길어질 수 있습니다. 260자 제한으로 `git worktree add`가 실패하면 다음을 한 번만 실행하세요.
  ```powershell
  git config --global core.longpaths true
  ```
- **Git Bash 권장**: runner 스킬이 실행하는 쉘 명령은 Git Bash에서 가장 안정적입니다. PowerShell/cmd 전용 환경이라면 `plan-copy.mjs` 같은 Node 헬퍼 경로로 대체되는지 확인하세요 (본 플러그인은 Node 헬퍼를 우선 사용하도록 설계되어 있습니다).
- **`codex.cmd` 자동 인식**: npm 전역 설치 시 `<nvm|npm-prefix>\codex.cmd`가 생성되며, SessionStart 훅이 `cmd.exe`를 경유해 감지합니다.

### macOS

- **Gatekeeper quarantine**: Codex를 npm 이외 경로(예: 수동 다운로드)로 설치한 경우 첫 실행 시 차단될 수 있습니다. 실행 파일 우클릭 → 열기로 예외 등록하세요.
- **`where.exe` 필요 없음**: POSIX `which`가 기본 사용됩니다.

### Linux

- **npm 전역 bin의 PATH 포함**: `~/.npm-global/bin` 또는 `/usr/local/bin`이 PATH에 있는지 확인하세요.
  ```bash
  echo $PATH | tr ':' '\n' | grep -E "npm-global|local/bin"
  ```

## 테스트

훅 계약(runner skill ↔ hook 스크립트)을 지키는지 확인하는 단위 테스트가 있습니다.

```bash
npm test
```

CI에서는 `.github/workflows/plugin-test.yml`이 **ubuntu / macOS / windows × Node 20·22** 조합으로 같은 테스트를 실행합니다.

## 빠르게 보려면

```bash
pnpm install
```

더 보고 싶다면 아래 문서부터 보시면 됩니다.

- [`docs/claude-code-workflow-evolution.md`](./docs/claude-code-workflow-evolution.md) — 워크플로 진화 기록
