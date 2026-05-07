# Brainstorm Workflow

## Workflow

### 1. Analyze request

Identify what is clear vs unclear:

- Required outcomes and constraints
- Missing decisions
- Plausible architecture/library branches
- Missing product-policy decisions across data model, business rules, UX behavior, permissions, validation, state/error handling, and accessibility expectations
- Missing test-strategy decisions that would change planning under the active plan wiki decision policy
- Touched work bundles such as components, hooks, routes, screens, or services
- Required execution-agent boundary and explicitly excluded execution areas
- Touched public boundaries such as props, callbacks, inputs, outputs, observable behavior, state ownership, and explicit exclusions

Rules:

- Treat the user's wording as canonical.
- Do not replace the user's wording with planner taxonomy when locking the request.
- If the user's wording is ambiguous, ask a concrete question instead of inventing a compressed label.
- Prefer itemized request decomposition over abstract summarization.

### 1a. Classify brainstorm path

Choose one path before asking questions:

| Path | Use when |
| --- | --- |
| Scope-lock path | User intent, UX, policy, public boundary, or acceptance is ambiguous. |
| Diagnostic-lock path | User intent is mostly clear, but the existing system state must be inventoried before scope, acceptance, or planning risk can be locked. |

Rules:

- For scope-lock path, ask only unresolved high-impact questions after deriving what local context can answer.
- For diagnostic-lock path, gather bounded evidence before asking questions unless the missing answer controls the investigation boundary itself.
- Treat "full inventory" as full coverage inside the user's stated boundary, not as an unbounded repository-wide audit.
- If both paths apply, lock the investigation boundary first, then run diagnostic inventory, then ask remaining confirmation questions.

### 2. Gather local context

Read only what is needed:

- Relevant folders and files inferred from the request
- Repository folder structure to locate current boundaries and ownership
- Existing code, tests, docs, and UI behavior that can answer questions without user input
- Existing `./plans/**`, `./.codex/artifacts/brainstorm/**`, and `./.codex/artifacts/ui-spec/**` artifacts when nearby prior work may answer the same question or reduce repeated clarification
- Legacy `./.codex/artifacts/design-discovery/**` artifacts only as read-only compatibility input when directly relevant
- `./.codex/` references only when they directly constrain this workflow
- `./.codex/plan-wiki/sync/current/core/common/용어-정책.md` when producing request-lock or artifact handoff text
- `./.codex/plan-wiki/sync/current/core/common/실행-라우팅.md` when the request needs execution-area locking

Do not assume or depend on `./.ai/` or any other external AI metadata directory.
Prefer related-artifact lookup before asking the user to restate a prior decision.

For diagnostic-lock path:

- Define the bounded investigation area from the user's wording before collecting evidence.
- Inventory every relevant public item inside that boundary, not only the first broken example.
- Compare authoritative references, current implementation, docs or controls, runtime behavior, tests, and available visual evidence when relevant.
- Record evidence gaps separately from confirmed differences.
- Do not turn findings into fixes during brainstorm; preserve them as facts, risks, open decisions, or planning inputs.
- Do not treat a tool-specific output as complete evidence when the request depends on broader current-system state.

### 3. Run plan wiki preflight when available

If artifact handoff is plausible, inspect the staged plan wiki before asking the user to confirm scope:

- resolve `plan_wiki_root` to `./.codex/plan-wiki/sync/current`
- if the planning root exists:
  - read `{plan_wiki_root}/registry.json`
  - read every path in `stage_core.brainstorm` when present; otherwise fall back to the registry `core` array and state that the wiki does not yet expose a brainstorm-specific core list
  - use `selection.brainstorm` when present to select candidate pattern files by domain first: always include `common`, add `frontend`, `backend`, or `infra` only when the user's request or local evidence touches that domain, then narrow by `domain_taxonomy.tags`
  - read only the selected pattern files whose `적용 조건` clauses materially help classify the current ambiguity
- if the planning root is missing or unreadable and artifact handoff is likely:
  - state that the plan wiki dependency is missing
  - continue in degraded brainstorm mode instead of pretending the preflight ran
  - state that plan wiki setup is required before planning

Use the preflight only to:

- classify missing information as `blocking`, `derivable`, or `deferrable`
- public boundary contract, state, ownership, exclusion, and no-op questions that would later block planning
- required execution areas and excluded execution areas that would later control which plan files are written
- test-strategy questions that would later make planning or TDD authoring guess
- capture applicable pattern guidance that narrows the confirmation questions or request-lock tables

Do not use the preflight to:

- choose phase topology
- assign `owner_agent`
- enforce `plan.md` formatting
- decide concrete source-tree test files, runner placement, execution routing, or review outcomes

Execution-area locking decides the required work areas and exclusions, not the final plan files. For example, lock "frontend only; backend and database are excluded because an existing API is in scope" instead of drafting `frontend.plan.md`.

### 4. Research latest information when needed

If technical choices depend on external facts (library/API/pattern changes), gather current information before asking for decisions.
If the choice is primarily about library, framework, package docs, API shape, migration path, or deprecation status, prefer Context7 before general web search.
Use Context7 only for the minimum facts that change the option comparison, recommendation, or blocking questions.
If reliable research tooling is unavailable, state that clearly and ask the user to confirm assumptions.

### 5. Challenge premises (required when the problem framing can still change the plan)

Before comparing implementation approaches, test the current framing:

- Is this the right problem framing, or would a narrower or better-targeted framing reduce risk?
- What happens if nothing changes right now?
- What existing code, flow, or policy already partially solves the request?
- If the request introduces a new user-visible artifact or delivery boundary, does rollout or delivery need to be made explicit now?

Rules:

- Keep premise challenges concrete and tied to the current request.
- Use premise challenges to reduce plan risk, not to expand scope for its own sake.
- If the premise itself is unstable, resolve that before comparing implementation approaches.

### 6. Compare approaches (required when real alternatives remain)

Present 2-3 options only when multiple viable directions still remain after reading the user's request and local context.
Present the option comparison as a markdown table.
For each option include:

- Pros
- Cons
- Risks
- Implementation cost

Rules:

- Frame options in the user's language and concrete affected areas, not planner shorthand.
- Avoid labels such as "shell-only" or similar internal taxonomy unless the user explicitly asked for those labels.
- If the user already chose the direction, skip the option table and move straight to the request lock tables.

Then recommend one option with concise rationale (YAGNI, maintainability, delivery risk).

### 7. Ask confirmation-focused questions

Ask only unresolved high-impact questions.

Rules:

- Max 4 questions at once
- Questions must be actionable
- Do not ask what can be derived from local context
- Questions should help the user confirm scope and direction quickly
- Prioritize blocking ambiguity that would change the implementation plan, tests, user-visible behavior, or public boundary
- Ask about test strategy only when it changes the plan or acceptance gate under the plan wiki decision policy; do not ask the user to name spec files, helper names, or assertion mechanics.
- For diagnostic-lock path, ask before inventory only when the missing answer controls the investigation boundary; otherwise gather evidence first
- If plan wiki preflight ran, prioritize questions that close preflight-identified `blocking` ambiguity first
- Prefer asking about concrete items, not planner taxonomies
- If more than 4 blocking questions exist, ask them in rounds
- Prefer structured user-input tooling when available; otherwise ask concise plain-text questions

### 8. Produce request-lock snapshot (default)

Return a concise request-lock snapshot in the response using markdown tables.

Required tables:

Apply the active plan wiki `core/common/용어-정책.md` to all human-readable table names and cell prose. Keep English only for exact code identifiers, API names, field keys, paths, and quoted user text.

1. `요청 대응표`
   - `사용자 요청 항목`
   - `이번 결정에서 고정한 내용`
   - `반영 대상`
   - `남은 미결정`

2. `작업 묶음 표`
   - `작업 묶음`
   - `이번에 바꾸는 것`
   - `유지되는 것`
   - `관련 영역`

3. `실행 영역 표`
   - `실행 영역`
   - `이번 판단`
   - `근거`
   - `제외 또는 포함 이유`

4. `공개 경계 표`
   - `대상`
   - `공개 경계`
   - `상태 소유권`
   - `callback / handoff`
   - `비고`

Optional table when exclusions matter:

5. `제외 항목 표`
   - `항목`
   - `처리`
   - `이유`
   - `사용자 승인 필요 여부`

Optional table when state rules matter:

6. `상태 소유권 표`
   - `대상`
   - `소유자`
   - `규칙`
   - `비고`

Optional table when test strategy changes planning or acceptance:

7. `테스트 전략 잠금 표`
   - `목표 또는 위험`
   - `잠글 검증`
   - `검증 단위` (`unit`, `Component Test`, `E2E`, `command`, `manual/visual`)
   - `관찰 지점`
   - `식별자 정책`
   - `runner / command / spec root` when first-time test setup or future test topology must be locked before planning
   - `mock / fixture 정책` when API, auth, browser storage, or seeded state must be simulated before real integration exists
   - `제외 범위`

Optional table when plan wiki preflight matters:

8. `plan wiki preflight 메모`
   - `검토 기준`
   - `이번에 잠근 내용`
   - `계획 입력 메모`
   - `남은 위험`

Optional tables for diagnostic-lock path:

9. `진단 기준선 표`
   - `조사 경계`
   - `권위 기준`
   - `현재 확인 대상`
   - `확인한 증거`
   - `남은 공백`

10. `차이 후보 표`
   - `대상`
   - `확인된 차이`
   - `근거`
   - `수정 판단 여부`
   - `planning 전달 메모`

Required table when an artifact handoff is plausible:

11. `planning-ready 판정표`
   - `상태` (`ready`, `blocking`, `derivable`, `excluded`)
   - `항목`
   - `판단`
   - `다음 조치`

Use the table to decide the final state. `ready_for_planning` is allowed only when every planning-changing item is `ready`, `derivable`, or explicitly `excluded`; any `blocking` row must select a `needs_*` state instead.

Figma-first design-system requests have an additional hard gate:

- If a Figma URL, node id, token/style value, component-set inventory, icon/logo/font parity, or design-system registry is the authority for implementation or validation, require a controller-verified Figma inventory artifact before planning.
- The artifact must name `manifest.json`, snapshot paths, `fileKey`, relevant node ids or roots, freshness, and coverage state.
- If the artifact is missing, stale, partial, or names-only where exact values are required, set the final state to `needs_diagnostic_inventory`, not `ready_for_planning`.
- Do not move "Figma 기준 확정", "inventory freeze", or similar authority creation into an implementation phase.

Then include:

- `남은 질문` if blocking ambiguity remains
- `추천 다음 상태` such as `needs_plan_wiki_setup`, `needs_locked_ui_direction`, `needs_diagnostic_inventory`, `needs_diagnostic_review`, `ready_for_planning`, or `ready_for_direct_execution`

Response formatting rules:

- Use markdown tables for the main option comparison and request-lock output.
- Keep recommendation rationale outside the table as a short paragraph or a few bullets when needed.
- Keep confirmation-focused questions as a short numbered list so the user can reply quickly.
- Do not leave the main comparison or request-lock snapshot as plain bullet lists unless the user explicitly asks for a different format.
- Do not let planner shorthand replace the user's wording in the tables.
- If user-visible UI direction remains blocking, state that `locked_ui_direction` is required before planning can continue.

### 9. Artifact export and durable handoff

When the recommended next state is `ready_for_planning`, write a durable request-lock artifact by default:

- `./.codex/artifacts/brainstorm/{feature-name}.md`

Include:

- `요청 대응표`
- `작업 묶음 표`
- `실행 영역 표`
- `공개 경계 표`
- `상태 소유권 표` when relevant
- `테스트 전략 잠금 표` when test strategy changes planning or acceptance
- `제외 항목 표` when relevant
- `plan wiki preflight 메모` when relevant
- `진단 기준선 표` and `차이 후보 표` when diagnostic-lock path is used
- `planning-ready 판정표`
- `남은 질문 / 가정`
- `추천 다음 상태`
- `artifact_status` set to one of `ready_for_planning`, `needs_plan_wiki_setup`, `needs_locked_ui_direction`, `needs_diagnostic_inventory`, `needs_diagnostic_review`, `needs_test_strategy_lock`, `needs_execution_environment_lock`, `needs_scope_lock`, or `superseded`
- `artifact_path`

Rules:

- Derive `{feature-name}` from the user's wording or the locked task slug when available.
- If the request-lock is not planning-ready yet, do not write a misleading ready artifact; keep the unresolved questions in chat or update an existing draft artifact only when that avoids losing already-locked decisions.
- If writing a non-ready draft artifact, set `artifact_status` to the exact `needs_*` state and make the `planning-ready 판정표` show the blocking row and next tool or user action.
- If an older artifact is superseded by a restart, set `artifact_status: superseded`, name `superseded_by`, and state why it must not be used as planning input.
- If filesystem write fails, state that planning cannot treat the chat-only snapshot as the durable authority.
- In the chat response, include the written artifact path and state that subsequent planning should consume it as a verified upstream input.

### 10. Quality gate before handoff

Before handoff, confirm:

- No hidden assumptions remain
- No blocking policy ambiguity remains for the chosen planning scope
- No touched public boundary remains vague enough that implementation would have to guess
- No test-strategy decision remains vague enough that planning or TDD contract test authoring would have to guess when it changes the plan
- No user-visible UI direction remains vague enough that planning would force later design guessing
- No exclusion was introduced without being made explicit
- If diagnostic-lock path was used, the investigated boundary, evidence gaps, and confirmed differences are separated from proposed fixes
- The user's requested items are still traceable in the request-lock tables
- If plan wiki preflight ran, its `blocking` findings are either locked or called out explicitly
- If plan wiki preflight could not run, the missing dependency is explicit before recommending planning
- If the request is `ready_for_planning`, the request-lock exists as a durable artifact or the missing artifact write is called out as a blocker
- If the request depends on Figma-first or other external authority, controller-verified authority artifacts exist as files before recommending planning
- The `planning-ready 판정표` contains no `blocking` row before recommending planning
- Blocking questions are explicit when another clarification round is still needed
- Recommended next state is clear

### 11. Handoff (when needed)

If user-visible UI direction such as hierarchy, state presentation, responsive behavior, or design-system fit remains blocking:

- hand off the locked request scope as `locked_request_scope`
- state that `locked_ui_direction` is still required before planning
- make the unresolved UI-direction questions explicit instead of burying them in prose

When planning is needed and scope is decision-complete enough for planning, provide:

1. The locked `요청 대응표`
2. The locked `작업 묶음 표`
3. The locked `실행 영역 표`
4. The locked `공개 경계 표`
5. Any `상태 소유권 표`, `테스트 전략 잠금 표`, or `제외 항목 표` that matters to planning
6. The durable request-lock artifact path
7. Explicit defaults or deferred low-risk choices
8. Diagnostic baseline findings that subsequent planning input should treat as already surfaced, including evidence gaps and confirmed differences when diagnostic-lock path was used
9. Plan wiki preflight findings that subsequent planning input should treat as already surfaced, or an explicit note that the preflight could not run because the plan wiki root was missing
10. Context7-confirmed external facts that subsequent planning input should treat as already resolved, plus any still-risky assumptions that may require fallback verification

If planning is needed but `./.codex/plan-wiki/sync/current` is missing or unreadable, state that plan wiki setup is required before planning.

Do not present the request as planning-ready while blocking ambiguity remains for a touched public boundary, exclusion boundary, or user-visible UI direction that would force design guessing.
