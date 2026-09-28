# Project Instructions — Workbench

## 프로젝트 기준

- Codex와 Claude Code에서 함께 쓰는 커스텀 스킬과 플러그인을 개발·검증하는 워크스페이스다.
- 메인 사용자-facing 제품은 `plugin/plugins/workbench/`다.
- 이 루트 `AGENTS.md`가 두 도구 공용 지침 진입점이다. Codex와 Claude Code 모두 자동으로 읽는다.
- 현재 구조와 책임 경계의 기준 문서는 `docs/current-architecture.md`, 설치·MCP 설정은 `docs/host-setup.md`다.
- `.agent/`는 장기 참고자료만 보관하며 지침 진입점이 아니다.

## 영역별 소유권

- `plugin/plugins/workbench/` — 두 도구의 manifest(`.codex-plugin/`, `.claude-plugin/`)와 네 개의 명시 호출 skill
- `plugin/.agents/plugins/marketplace.json`, `plugin/.claude-plugin/marketplace.json` — 도구별 `workbench` marketplace 등록
- `plugin/scripts/` — 두 도구 배포 스크립트
- `.codex/config.toml`, `.codex/skills/evaluate-workbench/` — 이 저장소 전용 Codex runtime 설정과 legacy v2 계약 회귀 벤치마크
- `docs/` — 현재 구조와 사용 중인 문서만 유지
- `legacy/` — Claude Code 플러그인, 과거 Codex planning stack과 Workbench v1·v2의 보관 영역

## 보호 영역

- Do NOT create, edit, move, or delete files under `.codex/` without explicit user approval.
- Keep `.codex/` limited to `config.toml` and `skills/evaluate-workbench/`; do not add other project-local skills, tools, artifacts, config, or wiki clones there without explicit user approval.
- `.codex/config.toml` owns Codex runtime settings that apply only to this repository, including the agent thread limit of 20 for parallel Workbench tasks.
- Treat `legacy/old/codex-planning-stack/dev-wiki/source/` and `legacy/old/codex-planning-stack/plan-wiki/source/` as repositories with Git boundaries separate from the root repository.
- Do NOT mix `plugin/` implementation changes with `.codex/` maintenance unless the requested work explicitly requires both, including moving or updating the Workbench evaluator.
- Do NOT treat files under `legacy/` as active product entrypoints or current workflow contracts.
- Do NOT treat `.codex/skills/evaluate-workbench/` as an evaluator for the active four-skill Workbench. It retains the legacy v2 `brainstorm` and `executor` regression contract until a separately approved migration.

## 스킬 컨벤션

- Prefer explicit negative constraints using `Do NOT` when a prohibited behavior must be unambiguous.
- `SKILL.md` frontmatter requires `name`, `description`, and `disable-model-invocation: true`. Do NOT add Claude Code-only frontmatter such as `model`, `context`, `agent`, or `allowed-tools`.
- Include Korean trigger phrases for skills intended for Korean users. Keep host-specific invocation syntax out of `description`.
- Keep skill entrypoints concise and move detailed procedures, schemas, and tool guidance to directly linked `references/` files.
- Keep the active Workbench limited to `shape`, `memory-update`, `prepare`, and `execute-task`.
- Require explicit invocation for every active Workbench skill: `$workbench:<skill>` in Codex and `/workbench:<skill>` in Claude Code. Keep both `allow_implicit_invocation: false` in `agents/openai.yaml` and `disable-model-invocation: true` in `SKILL.md`. Do NOT auto-chain one Workbench skill into another.
- Keep skill bodies host-neutral. Put host differences only in each skill's delegation reference (`shape/references/analysis-delegation.md`, `prepare/references/model-selection.md`, `execute-task/references/worker-profiles.md`, `memory-update/references/memory-change-set.md`).
- Use local `.codocs` as the project knowledge and implementation-rule basis for Shape, Prepare, and Execute Task. When an external library fact affects a decision, use Context7 when available and verify it with official source links; fall back to direct official sources when Context7 is unavailable or insufficient.
- Shape, Prepare, and Execute Task may read user-supplied Wiki Artifacts as task inputs, but do not query canonical Wikis or Jira for project rules. When a request links Figma, Shape retrieves relevant evidence read-only. Do NOT create issues/comments/transitions or mutate Figma files/nodes from Shape.
- Keep every Workbench skill self-contained. Do NOT name, require, recommend, or advertise another Workbench skill inside a skill body or reference contract.
- Accept producer-neutral inputs: Prepare accepts any sufficient change definition, Execute Task accepts a bounded objective or complete packet, and Memory Update accepts one or more bounded project-knowledge topics.
- Select explicit task/helper profiles as a host-neutral tier (`focused`, `standard`, `deep`) and effort rather than inheriting the host. Map tiers per host: Codex `gpt-6-luna`/`gpt-6-sol`/`gpt-6-astra`, Claude Code `haiku`/`sonnet`/`opus`. Claude Code subagents follow the session effort. Keep profile choices and reasons in implementation plans. Allow bounded independent read-only research delegation when useful.
- Keep execution checks and self-review proportional to the change; do not introduce a mandatory separate final review stage.
- Let Shape and Prepare inspect the current checkout read-only. Require Execute Task to materialize only its validated task-scoped path and branch.
- Use Local Work Memory only to resolve supplied Artifact references in the applicable workflow. Memory Update curates only local `.codocs` documents and necessary navigation, following project authoring rules and processing every bounded topic sequentially. Do NOT read or update Wiki knowledge or synchronize stores through Memory Update, even when older project procedures describe paired updates.

## 작업 규칙

- Preserve existing user changes and keep unrelated cleanup out of the current work unit.
- Do NOT modify repository files in the user's local checkout. Create or use a dedicated Git worktree and task branch before writing any repository change, and keep the local checkout available for the user's other work.
- Use one unique worktree and branch per prepared implementation or integration Task Packet. Do not create or reserve a coordinator worktree.
- Do NOT silently omit uncommitted local changes that the requested work depends on. Stop and establish an explicit base commit or inclusion strategy with the user.
- There is no automated test suite. Validate changed behavior directly on the affected hosts, for example by deploying with `npm run deploy` and invoking the changed skill.
- Do NOT commit, push, publish, or open a PR unless the user explicitly asks. For Workbench execution, an explicitly approved Execution Plan with `commit_policy: task_local_required` counts as task-local commit authorization only.
- An explicit Execute Task request using its review-delivery workflow with a resolved PR source/head target authorizes integrating verified task results into that head history and pushing that exact delivery commit. Preserve an explicit local-only/no-push policy. This does not authorize PR creation, a merge into the PR base, deployment, or cleanup; the coordinator stays read-only and a publisher worker uses an isolated worktree.
- Do NOT merge task branches into the local checkout or delete worktrees without explicit user authorization.
