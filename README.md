# try-claude-code

Claude Code 스킬, 에이전트, 플러그인, 워크플로를 실험하는 저장소입니다.

완성된 제품이라기보다는, "어떤 구조가 더 적은 문맥으로도 안정적으로 같은 결과를 내는가"를 계속 확인해보는 작업대에 가깝습니다.

## 어떤 걸 실험하나요?

- 계획 스킬(`.codex/skills`)로 요청을 분해하고, 실행 스킬(`plugin/skills`)로 구현하는 흐름
- 에이전트(`plugin/agents`)를 통한 역할 분리 — frontend, backend, general, doc, e2e test
- Hook 시스템(`plugin/hooks`)으로 세션 라이프사이클과 리뷰 게이트 자동화
- Status line(`plugin/statusline/`)으로 모델·비용·캐시·Git·외부 서비스 상태를 터미널에 통합

## 프로젝트 구성

```
.codex/skills/        # 계획·설계 스킬 (외부 vault symlink)
.codex/agents/        # 에이전트 정의 (외부 vault symlink)
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
| `init-codex` | .codex 에셋을 중앙 vault로 symlink |
| `init-statusline` | 멀티라인 상태줄 초기 설정 (파일 복사 + settings.json 등록) |

### 계획 스킬 (`.codex/skills/`)

외부 vault(Google Drive)에서 symlink로 공유됩니다. `architect`, `brainstorm`, `planner-lite` 등.

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

## 빠르게 보려면

```bash
pnpm install
```

더 보고 싶다면 아래 문서부터 보시면 됩니다.

- [`docs/claude-code-workflow-evolution.md`](./docs/claude-code-workflow-evolution.md) — 워크플로 진화 기록
