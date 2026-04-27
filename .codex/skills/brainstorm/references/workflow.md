# Brainstorm Workflow

## Workflow

### 1. Analyze request

Identify what is clear vs unclear:

- Required outcomes and constraints
- Missing decisions
- Plausible architecture/library branches
- Missing product-policy decisions across data model, business rules, UX behavior, permissions, validation, state/error handling, and accessibility expectations
- Touched work bundles such as components, hooks, routes, screens, or services
- Touched public boundaries such as props, callbacks, inputs, outputs, observable behavior, state ownership, and explicit exclusions

Rules:

- Treat the user's wording as canonical.
- Do not replace the user's wording with planner taxonomy when locking the request.
- If the user's wording is ambiguous, ask a concrete question instead of inventing a compressed label.
- Prefer itemized request decomposition over abstract summarization.

### 2. Gather local context

Read only what is needed:

- Relevant folders and files inferred from the request
- Repository folder structure to locate current boundaries and ownership
- Existing code, tests, docs, and UI behavior that can answer questions without user input
- Existing `./plans/**`, `./.codex/artifacts/brainstorm/**`, and `./.codex/artifacts/design-discovery/**` artifacts when nearby prior work may answer the same question or reduce repeated clarification
- `./.codex/` references only when they directly constrain this workflow
- `../architect/references/terminology-policy.md` when producing request-lock or planning handoff text

Do not assume or depend on `./.ai/` or any other external AI metadata directory.
Prefer related-artifact lookup before asking the user to restate a prior decision.

### 3. Run review wiki preflight when available

If planning handoff is plausible, inspect the staged review wiki before asking the user to confirm scope:

- resolve `review_wiki_root` to `./.codex/review-wiki/sync/current`
- if the planning root exists:
  - read `{review_wiki_root}/registry.json`
  - read every path in `stage_core.brainstorm` when present; otherwise fall back to the registry `core` array and state that the wiki does not yet expose a brainstorm-specific core list
  - use `selection.brainstorm` when present to select candidate pattern files
  - read only the selected pattern files whose `적용 조건` clauses materially help classify the current ambiguity
- if the planning root is missing or unreadable and planning handoff is likely:
  - state that the review wiki dependency is missing
  - continue in degraded brainstorm mode instead of pretending the preflight ran
  - recommend `review-wiki-setup` before `architect` or `orchestrator`

Use the preflight only to:

- classify missing information as `blocking`, `derivable`, or `deferrable`
- public boundary contract, state, ownership, exclusion, and no-op questions that would later block planning
- capture applicable pattern guidance that narrows the confirmation questions or request-lock tables

Do not use the preflight to:

- choose phase topology
- assign `owner_agent`
- enforce `plan.md` formatting
- decide execution routing, test materialization scope, or review outcomes

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
- If review wiki preflight ran, prioritize questions that close preflight-identified `blocking` ambiguity first
- Prefer asking about concrete items, not planner taxonomies
- If more than 4 blocking questions exist, ask them in rounds
- Prefer structured user-input tooling when available; otherwise ask concise plain-text questions

### 8. Produce request-lock snapshot (default)

Return a concise request-lock snapshot in the response using markdown tables.

Required tables:

Apply `../architect/references/terminology-policy.md` to all human-readable table names and cell prose. Keep English only for exact code identifiers, API names, field keys, paths, and quoted user text.

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

3. `공개 경계 표`
   - `대상`
   - `공개 경계`
   - `상태 소유권`
   - `callback / handoff`
   - `비고`

Optional table when exclusions matter:

4. `제외 항목 표`
   - `항목`
   - `처리`
   - `이유`
   - `사용자 승인 필요 여부`

Optional table when state rules matter:

5. `상태 소유권 표`
   - `대상`
   - `소유자`
   - `규칙`
   - `비고`

Optional table when review wiki preflight matters:

6. `review wiki preflight 메모`
   - `검토 기준`
   - `이번에 잠근 내용`
   - `architect에 넘길 메모`
   - `남은 위험`

Then include:

- `남은 질문` if blocking ambiguity remains
- `추천 다음 단계` (`review-wiki-setup`, `design-discovery`, `architect`, or direct execution)

Response formatting rules:

- Use markdown tables for the main option comparison and request-lock output.
- Keep recommendation rationale outside the table as a short paragraph or a few bullets when needed.
- Keep confirmation-focused questions as a short numbered list so the user can reply quickly.
- Do not leave the main comparison or request-lock snapshot as plain bullet lists unless the user explicitly asks for a different format.
- Do not let planner shorthand replace the user's wording in the tables.
- If user-visible UI direction remains blocking, recommend `design-discovery` before `architect`.

### 9. Optional artifact export (only on explicit user request)

If and only if the user explicitly asks for a written artifact, export to:

- `./.codex/artifacts/brainstorm/{feature-name}.md`

Include:

- `요청 대응표`
- `작업 묶음 표`
- `공개 경계 표`
- `상태 소유권 표` when relevant
- `제외 항목 표` when relevant
- `review wiki preflight 메모` when relevant
- `남은 질문 / 가정`
- `추천 다음 단계`

### 10. Quality gate before handoff

Before handoff, confirm:

- No hidden assumptions remain
- No blocking policy ambiguity remains for the chosen planning scope
- No touched public boundary remains vague enough that implementation would have to guess
- No user-visible UI direction remains vague enough that planning would force later design guessing
- No exclusion was introduced without being made explicit
- The user's requested items are still traceable in the request-lock tables
- If review wiki preflight ran, its `blocking` findings are either locked or called out explicitly
- If review wiki preflight could not run, the missing dependency is explicit before recommending planning
- Blocking questions are explicit when another clarification round is still needed
- Recommended next step is clear

### 11. Handoff to `design-discovery` or `architect` (when needed)

If user-visible UI direction such as hierarchy, state presentation, responsive behavior, or design-system fit remains blocking:

- hand off the locked request scope to `design-discovery` before `architect`
- make the unresolved UI-direction questions explicit instead of burying them in prose

When planning is needed and scope is decision-complete enough for planning, provide:

1. The locked `요청 대응표`
2. The locked `작업 묶음 표`
3. The locked `공개 경계 표`
4. Any `상태 소유권 표` or `제외 항목 표` that matters to planning
5. Explicit defaults or deferred low-risk choices
6. Review wiki preflight findings that `architect` should treat as already surfaced, or an explicit note that the preflight could not run because the review wiki root was missing
7. Context7-confirmed external facts that `architect` should treat as already resolved, plus any still-risky assumptions that may require fallback verification

If planning is needed but `./.codex/review-wiki/sync/current` is missing or unreadable, recommend `review-wiki-setup` before `architect`.

Do not hand off to `architect` while blocking ambiguity remains for a touched public boundary, exclusion boundary, or user-visible UI direction that would force design guessing.
