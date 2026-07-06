# Project Memory - try-Codex

## 프로젝트 개요
- Codex 커스텀 스킬 워크스페이스
- Codex용 실행 플러그인과 Codex용 planning stack을 함께 실험하는 저장소
- 스킬 개발, 테스트, 실험을 위한 프로젝트

## 디렉토리 구조
- `claude-plugin/develop/` — 메인 Codex 개발 플러그인 (skills, agents, hooks, scripts, references)
- `claude-plugin/statusline/` — 상태줄 전용 플러그인
- `codex-plugin/plugins/workbench/` — Codex 워크벤치 플러그인 (issue-brief, brainstorm, test-brief, executor, visual-grounding, branch-work-report, openapi, dev-wiki)
- `.codex/` — Codex planning stack (skills, tools, plan-wiki)
- `.agent/` — agent 행동 원칙과 지식 원천 정리 자료
- `docs/` — 워크플로 진화 기록 등 문서
- `plans/` — 작업별 planning/review 산출물 (`plans/{task}/`)

## `.codex/` — 수정 금지 (DO NOT MODIFY)
- `.codex/` 이하는 Codex가 소유하는 planning/설계 영역이며 **Codex가 직접 수정하지 않는다.**
- 여기 포함: `.codex/skills/` (brainstorm, ui-spec, plan-maker, plan-tdd, plan-review, orchestrator, plan-wiki-*, figma-inventory-snapshot), `.codex/tools/`, `.codex/plan-wiki/`
- 읽기/참조는 가능하나, 내용 변경·생성·삭제가 필요하면 먼저 사용자에게 확인한다.

## `claude-plugin/develop/` — 스킬별 역할
- **commit** — Conventional Commits 규칙으로 git 커밋. 트리거: `commit`, `/commit`, `커밋`, `커밋해줘`
- **pr** — GitHub Pull Request 생성. 트리거: `PR`, `pull request`, `PR 올려줘`, `풀리퀘`
- **backend-dev** — 백엔드 API/DB/인증/서버 로직. 프레임워크·언어 자동 감지. `backend-developer` agent에서 실행
- **frontend-dev** — React/Next.js/Expo UI 컴포넌트, 훅, 상태관리, API 연동. `frontend-developer` agent에서 실행
- **general-dev** — Docker, CI/CD, nginx, env, 모노레포 빌드/배포 등 frontend/backend에 속하지 않는 인프라. `general-developer` agent에서 실행
- **runner** — 단일 self-contained plan을 하나의 worktree에서 실행, agent 하나를 dispatch하고 dev-review로 머지를 게이트. HEAD는 base 브랜치 유지
- **dev-review** — runner 실행 후 commit 기반 브라우저 리뷰 게이트. localhost에 GitHub 스타일 UI 서빙, `needs-change`/`question`/`out-of-scope` 코멘트를 worktree로 라우팅

`claude-plugin/develop/agents/` — 위 dev 스킬이 위임받아 실행되는 sub-agent 정의 (backend-developer, frontend-developer, general-developer)

## `claude-plugin/statusline/` — 스킬별 역할
- **statusline** — inline 상태줄 on/off, inline/box 전환. 트리거: `statusline`, `상태줄`, `상태줄 켜기`, `상태줄 끄기`

## `codex-plugin/plugins/workbench/` — 스킬별 역할
- **issue-brief** — Jira 링크가 없어도 사용자 프롬프트, QA 리포트, pasted issue text, Figma/OpenAPI/repo evidence를 기반으로 confirmed facts, unconfirmed assumptions, bug/reproduction evidence, work units를 정리
- **brainstorm** — 선택된 work unit의 current context, diagnostic plan, implementation notes, risks, checks 정리. 원인 불명 버그는 재현/계측/가설 기각 계획을 먼저 세움
- **test-brief** — 구현 전 contract/regression test 또는 measurement brief 작성. 영구 테스트와 임시 계측/승격 기준을 구분
- **executor** — 선택된 work unit 하나를 구현/진단. 원인 불명 버그는 재현 → 계측 → 가설 기각 → 원인 확정 → 최소 수정 → 정량 재검증 루프를 따름
- **visual-grounding** — Figma/source UI/reference screenshot과 local target 비교, interaction evidence(click/drag/focus/scroll 등) 수집
- **branch-work-report** — 현재 branch 작업을 commit 단위로 보고하고, 버그 수정의 원인 근거/검증/임시 계측 잔류물을 리뷰
- **openapi** — 등록된 Swagger/OpenAPI 서비스 검색, 갱신, endpoint inspect/test 보조
- **dev-wiki** — Workbench-owned dev wiki setup/audit/update/lint/graph 관리

## `.agent/` — 지식 원천
- `.agent/fable5/` — Fable 5 행동 원칙 원본 정리 4개와 통합 완전판. codex-plugin workbench 스킬 개선의 근거 자료로 사용

## 컨벤션
- 스킬 작성 시 부정 명시("Do NOT") 형식 우선 사용
- SKILL.md frontmatter: name, description 필수 / model, allowed-tools 선택
- 한국어 사용자 대상 스킬은 한국어 트리거 포함
