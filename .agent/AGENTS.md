# Project Instructions — try-Codex

## 프로젝트 기준

- Codex 커스텀 스킬과 플러그인을 개발·검증하는 워크스페이스다.
- 메인 사용자-facing 제품은 `codex-plugin/plugins/workbench/`다.
- 현재 구조와 책임 경계의 기준 문서는 `docs/current-architecture.md`다.
- `.agent/`는 이 저장소의 행동 원칙과 장기 참고자료의 원천이며 자동 지침 진입점이 아니다.

## 영역별 소유권

- `codex-plugin/plugins/workbench/` — Workbench manifest, 다섯 개의 명시 호출 skill, MCP 설정, 계약 테스트
- `codex-plugin/.agents/plugins/marketplace.json` — 현재 Codex marketplace 등록
- `.codex/AGENTS.md`, `.codex/config.toml`, `.codex/skills/evaluate-workbench/` — 보호 경계와 legacy v2 계약 회귀 벤치마크
- `.claude/CLAUDE.md` — 이 파일을 import하는 Claude Code 전용 어댑터
- `.github/workflows/workbench-test.yml` — 활성 Workbench CI
- `docs/` — 현재 구조와 사용 중인 문서만 유지
- `legacy/` — Claude Code 플러그인, 과거 Codex planning stack과 Workbench v1·v2의 보관 영역

## 보호 영역

- Do NOT create, edit, move, or delete files under `.codex/` without explicit user approval.
- Keep `.codex/` limited to `AGENTS.md`, `config.toml`, and `skills/evaluate-workbench/`; do not add other project-local skills, tools, artifacts, config, or wiki clones there without explicit user approval.
- Treat `legacy/old/codex-planning-stack/dev-wiki/source/` and `legacy/old/codex-planning-stack/plan-wiki/source/` as repositories with Git boundaries separate from the root repository.
- Do NOT mix `codex-plugin/` implementation changes with `.codex/` maintenance unless the requested work explicitly requires both, including moving or updating the Workbench evaluator.
- Do NOT treat files under `legacy/` as active product entrypoints or current workflow contracts.
- Do NOT treat `.codex/skills/evaluate-workbench/` as an evaluator for the active five-skill Workbench. It retains the legacy v2 `brainstorm` and `executor` regression contract until a separately approved migration.

## 스킬 컨벤션

- Prefer explicit negative constraints using `Do NOT` when a prohibited behavior must be unambiguous.
- `SKILL.md` frontmatter requires `name` and `description`; `model` and `allowed-tools` are optional.
- Include Korean trigger phrases for skills intended for Korean users.
- Keep skill entrypoints concise and move detailed procedures, schemas, and tool guidance to directly linked `references/` files.
- Keep the active Workbench limited to `shape`, `memory-update`, `prepare`, `execute-task`, and `finalize`.
- Require `$workbench:<skill>` explicit invocation and `allow_implicit_invocation: false` for every active Workbench skill. Do NOT auto-chain one Workbench skill into another.
- Require Shape to read relevant Local Work Memory before decision-making. When an external library fact affects a decision, use Context7 when available and verify it with official source links; fall back to direct official sources when Context7 is unavailable or insufficient.
- When a request links Jira or Figma, require Shape to retrieve only the referenced project evidence and remain read-only toward both systems. Do NOT create issues/comments/transitions or mutate Figma files/nodes from Shape.
- Keep every Workbench skill self-contained. Do NOT name, require, recommend, or advertise another Workbench skill inside a skill body or reference contract.
- Accept producer-neutral inputs: Prepare accepts any sufficient change definition, Execute Task accepts a bounded objective or complete packet, Memory Update accepts one or more bounded project-knowledge topics, and Finalize accepts any exact immutable Git change.
- Let Shape and Prepare inspect the current checkout read-only. Require Execute Task to materialize only its validated task-scoped path and branch.
- Use the Local Work Memory MCP for current project documents and user-supplied Artifact references; use Memory Update only when the user explicitly requests Wiki curation, then process every bounded in-scope topic sequentially rather than imposing a one-Wiki invocation limit.

## 작업 규칙

- Preserve existing user changes and keep unrelated cleanup out of the current work unit.
- Do NOT modify repository files in the user's local checkout. Create or use a dedicated Git worktree and task branch before writing any repository change, and keep the local checkout available for the user's other work.
- Use one unique worktree and branch per prepared implementation or integration Task Packet. Do not create or reserve a coordinator worktree.
- Do NOT silently omit uncommitted local changes that the requested work depends on. Stop and establish an explicit base commit or inclusion strategy with the user.
- Use focused validation for the touched surface, then run broader checks only when they are relevant and currently valid.
- Use `npm test` for the active Workbench Node contract suite. Treat any `.codex/skills/evaluate-workbench` test as legacy evaluator regression only.
- Do NOT commit, push, publish, or open a PR unless the user explicitly asks. For Workbench execution, an explicitly approved Execution Plan with `commit_policy: task_local_required` counts as task-local commit authorization only.
- Do NOT merge task branches into the local checkout or delete worktrees without explicit user authorization.
