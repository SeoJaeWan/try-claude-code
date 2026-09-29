# Project Instructions — Workbench

## 프로젝트 기준

- Codex와 Claude Code에서 함께 쓰는 커스텀 스킬과 플러그인을 개발·검증하는 워크스페이스다.
- 메인 사용자-facing 제품은 `plugin/plugins/workbench/`다.
- 이 루트 `AGENTS.md`가 두 도구 공용 지침 진입점이다. Codex와 Claude Code 모두 자동으로 읽는다.
- 현재 구조와 책임 경계의 기준 문서는 `docs/current-architecture.md`, 설치·MCP 설정은 `docs/host-setup.md`다.

## 영역별 소유권

- `plugin/plugins/workbench/` — 두 도구의 manifest(`.codex-plugin/`, `.claude-plugin/`)와 다섯 개의 명시 호출 skill
- `plugin/.agents/plugins/marketplace.json`, `plugin/.claude-plugin/marketplace.json` — 도구별 `workbench` marketplace 등록
- `plugin/scripts/` — 두 도구 배포 스크립트
- `docs/` — 현재 구조와 사용 중인 문서만 유지
- `legacy/` — Claude Code 플러그인, 과거 Codex planning stack, Workbench v1·v2, Fable 5 운영 참고자료(`legacy/fable5/`)의 보관 영역

## 보호 영역

- Treat `legacy/old/codex-planning-stack/dev-wiki/source/` and `legacy/old/codex-planning-stack/plan-wiki/source/` as repositories with Git boundaries separate from the root repository.
- Do NOT treat files under `legacy/` as active product entrypoints or current workflow contracts.

## 스킬 컨벤션

- Prefer explicit negative constraints using `Do NOT` when a prohibited behavior must be unambiguous.
- `SKILL.md` frontmatter requires `name`, `description`, and `disable-model-invocation: true`. Do NOT add Claude Code-only frontmatter such as `model`, `context`, `agent`, or `allowed-tools`.
- Include Korean trigger phrases for skills intended for Korean users. Keep host-specific invocation syntax out of `description`.
- Keep skill entrypoints concise and move detailed procedures, schemas, and tool guidance to directly linked `references/` files.
- Keep the active Workbench limited to `shape`, `memory-update`, `prepare`, `execute-task`, and `pr-push`.
- Require explicit invocation for every active Workbench skill: `$workbench:<skill>` in Codex and `/workbench:<skill>` in Claude Code. Keep both `allow_implicit_invocation: false` in `agents/openai.yaml` and `disable-model-invocation: true` in `SKILL.md`. Do NOT auto-chain one Workbench skill into another.
- Keep skill bodies host-neutral. Put host-specific delegation differences in the relevant reference (`shape/references/analysis-delegation.md`, `prepare/references/model-selection.md`, `execute-task/references/worker-profiles.md`, `memory-update/references/memory-change-set.md`); delivery/cleanup uses available host capabilities without assuming a particular host.
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
- Edit repository files directly in the current `main` checkout. Do NOT create a separate worktree or task branch for direct authoring work. Normal completion of authorized work may integrate verified commits into its known clean, idle local target, including primary/pinned, without separate permission. Confirm the target belongs to the authorized work; do NOT substitute an arbitrary PR base/default branch for a source-branch target. Do NOT update a checked-out branch ref behind that checkout or integrate into dirty/active/shared or uncertain-ownership checkouts. Local integration grants no automatic push/publication authority and permits neither arbitrary edits nor removal of the target checkout.
- Use one unique worktree and branch per prepared implementation or integration Task Packet. Do not create or reserve a coordinator worktree.
- Do NOT silently omit uncommitted local changes that the requested work depends on. Stop and establish an explicit base commit or inclusion strategy with the user.
- There is no automated test suite. Validate changed skill contracts with focused static and scenario checks and report the limits. Deploy/install and live host invocation require applicable authorization and are not mandatory authoring checks.
- Do NOT commit, push, publish, or open a PR unless the user explicitly asks. For Workbench execution, an explicitly approved Execution Plan with `commit_policy: task_local_required` counts as task-local commit authorization only.
- An explicit Execute Task request with a confirmed local PR source/head target enables verified local integration, durable checkpointing outside removable worktrees, and safe cleanup of only its quiescent task-owned worktrees. Preserve explicit no-integration/no-cleanup instructions; remote push is NOT_REQUESTED. The coordinator stays read-only and the assigned worker performs integration/cleanup. Remove/archive only after exact results are reachable from the confirmed local source branch and needed evidence is preserved. Never remove dirty/unmerged/shared/pinned/primary/currently needed checkouts or delete branches by default. Use host archive for managed worktrees and ordinary Git removal without force for clean proven task worktrees; report limitations rather than false completion.
- An explicit `pr-push` request authorizes normal exact-head source-branch push and required in-scope release metadata edits/commits when project policy permits. Detect the repository's real release convention, honor accepted decisions, and ask only for material unresolved choices. Do NOT infer push authority from an execution plan or local completion.
- Neither local execution finish nor source push authorizes PR creation, base merge, deployment, package/release publishing, history rewrite, or messaging. Keep push separate and explicitly invoked; do NOT auto-chain skills.
