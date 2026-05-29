# Project Memory - try-claude-code

## 프로젝트 개요
- Claude Code 커스텀 스킬 워크스페이스
- Claude Code용 실행 플러그인과 Codex용 planning stack을 함께 실험하는 저장소
- 스킬 개발, 테스트, 실험을 위한 프로젝트

## 디렉토리 구조
- `plugin/develop/` — 메인 Claude Code 개발 플러그인 (skills, agents, hooks, scripts, references)
- `plugin/statusline/` — 상태줄 전용 플러그인
- `.codex/` — Codex planning stack (skills, tools, plan-wiki)
- `docs/` — 워크플로 진화 기록 등 문서
- `plans/` — 작업별 planning/review 산출물 (`plans/{task}/`)

## `.codex/` — 수정 금지 (DO NOT MODIFY)
- `.codex/` 이하는 Codex가 소유하는 planning/설계 영역이며 **Claude가 직접 수정하지 않는다.**
- 여기 포함: `.codex/skills/` (brainstorm, ui-spec, plan-maker, plan-tdd, plan-review, orchestrator, plan-wiki-*, figma-inventory-snapshot), `.codex/tools/`, `.codex/plan-wiki/`
- 읽기/참조는 가능하나, 내용 변경·생성·삭제가 필요하면 먼저 사용자에게 확인한다.

## `plugin/develop/` — 스킬별 역할
- **commit** — Conventional Commits 규칙으로 git 커밋. 트리거: `commit`, `/commit`, `커밋`, `커밋해줘`
- **pr** — GitHub Pull Request 생성. 트리거: `PR`, `pull request`, `PR 올려줘`, `풀리퀘`
- **backend-dev** — 백엔드 API/DB/인증/서버 로직. 프레임워크·언어 자동 감지. `backend-developer` agent에서 실행
- **frontend-dev** — React/Next.js/Expo UI 컴포넌트, 훅, 상태관리, API 연동. `frontend-developer` agent에서 실행
- **general-dev** — Docker, CI/CD, nginx, env, 모노레포 빌드/배포 등 frontend/backend에 속하지 않는 인프라. `general-developer` agent에서 실행
- **runner** — 단일 self-contained plan을 하나의 worktree에서 실행, agent 하나를 dispatch하고 dev-review로 머지를 게이트. HEAD는 base 브랜치 유지
- **dev-review** — runner 실행 후 commit 기반 브라우저 리뷰 게이트. localhost에 GitHub 스타일 UI 서빙, `needs-change`/`question`/`out-of-scope` 코멘트를 worktree로 라우팅

`plugin/develop/agents/` — 위 dev 스킬이 위임받아 실행되는 sub-agent 정의 (backend-developer, frontend-developer, general-developer)

## `plugin/statusline/` — 스킬별 역할
- **statusline** — inline 상태줄 on/off, inline/box 전환. 트리거: `statusline`, `상태줄`, `상태줄 켜기`, `상태줄 끄기`

## 컨벤션
- 스킬 작성 시 부정 명시("Do NOT") 형식 우선 사용
- SKILL.md frontmatter: name, description 필수 / model, allowed-tools 선택
- 한국어 사용자 대상 스킬은 한국어 트리거 포함
