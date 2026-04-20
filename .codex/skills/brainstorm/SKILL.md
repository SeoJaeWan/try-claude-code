---
name: brainstorm
description: Codex entry skill for request-lock brainstorming. Use when the user's goal, scope, public surface, acceptance, exclusions, or user-visible UI direction must be decomposed and fixed in the user's own language before planning.
---

<Skill_Guide>
<Purpose>
Clarify ambiguous requests by locking the user's requested outcome, affected work bundles, public surfaces, ownership rules, exclusions, and pre-planning risk areas in the user's own language before planning starts.
</Purpose>

<Instructions>
# brainstorm

Use this as the entrypoint when ambiguity can change architecture, scope, tooling, API contracts, product policy, UX, or delivery strategy.

## When to use

- Request is ambiguous: "add login", "make dashboard", "improve UX".
- Multiple approaches are plausible and tradeoffs matter.
- Library/framework/pattern choices need to be made.
- Business-rule, UX, validation, permission, or state behavior policy is missing.
- Acceptance criteria are missing or vague.
- Public props, callback names, state ownership, or exclusions are still unclear.
- User-visible screens, layout, hierarchy, or state presentation are changing and the UI direction is still fuzzy.
- The user wants clarification questions before committing to a plan.

## When not to use

- Request is already decision-complete with clear scope, acceptance criteria, and touched public contracts.
- Task is straightforward with no meaningful tradeoff.

## Workflow

### 1. Analyze request

Identify what is clear vs unclear:

- Required outcomes and constraints
- Missing decisions
- Plausible architecture/library branches
- Missing product-policy decisions across data model, business rules, UX behavior, permissions, validation, state/error handling, and accessibility expectations
- Touched work bundles such as components, hooks, routes, screens, or services
- Touched public surfaces such as props, callbacks, inputs, outputs, observable behavior, state ownership, and explicit exclusions

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

Do not assume or depend on `./.ai/` or any other external AI metadata directory.
Prefer related-artifact lookup before asking the user to restate a prior decision.

### 3. Research latest information when needed

If technical choices depend on external facts (library/API/pattern changes), gather current information before asking for decisions.
If the choice is primarily about library, framework, package docs, API shape, migration path, or deprecation status, prefer Context7 before general web search.
Use Context7 only for the minimum facts that change the option comparison, recommendation, or blocking questions.
If reliable research tooling is unavailable, state that clearly and ask the user to confirm assumptions.

### 4. Challenge premises (required when the problem framing can still change the plan)

Before comparing implementation approaches, test the current framing:

- Is this the right problem framing, or would a narrower or better-targeted framing reduce risk?
- What happens if nothing changes right now?
- What existing code, flow, or policy already partially solves the request?
- If the request introduces a new user-visible artifact or delivery surface, does rollout or delivery need to be made explicit now?

Rules:

- Keep premise challenges concrete and tied to the current request.
- Use premise challenges to reduce plan risk, not to expand scope for its own sake.
- If the premise itself is unstable, resolve that before comparing implementation approaches.

### 5. Compare approaches (required when real alternatives remain)

Present 2-3 options only when multiple viable directions still remain after reading the user's request and local context.
Present the option comparison as a markdown table.
For each option include:

- Pros
- Cons
- Risks
- Implementation cost

Rules:

- Frame options in the user's language and concrete surfaces, not planner shorthand.
- Avoid labels such as "shell-only" or similar internal taxonomy unless the user explicitly asked for those labels.
- If the user already chose the direction, skip the option table and move straight to the request lock tables.

Then recommend one option with concise rationale (YAGNI, maintainability, delivery risk).

### 6. Ask confirmation-focused questions

Ask only unresolved high-impact questions.

Rules:

- Max 4 questions at once
- Questions must be actionable
- Do not ask what can be derived from local context
- Questions should help the user confirm scope and direction quickly
- Prioritize blocking ambiguity that would change the implementation plan, tests, user-visible behavior, or public surface
- Prefer asking about concrete items, not planner taxonomies
- If more than 4 blocking questions exist, ask them in rounds
- Prefer structured user-input tooling when available; otherwise ask concise plain-text questions

### 7. Produce request-lock snapshot (default)

Return a concise request-lock snapshot in the response using markdown tables.

Required tables:

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

3. `공개 surface 표`
   - `대상`
   - `public surface`
   - `state ownership`
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
   - `surface`
   - `owner`
   - `규칙`
   - `비고`

Then include:

- `남은 질문` if blocking ambiguity remains
- `추천 다음 단계` (`design-discovery`, `architect`, or direct execution)

Response formatting rules:

- Use markdown tables for the main option comparison and request-lock output.
- Keep recommendation rationale outside the table as a short paragraph or a few bullets when needed.
- Keep confirmation-focused questions as a short numbered list so the user can reply quickly.
- Do not leave the main comparison or request-lock snapshot as plain bullet lists unless the user explicitly asks for a different format.
- Do not let planner shorthand replace the user's wording in the tables.
- If user-visible UI direction remains blocking, recommend `design-discovery` before `architect`.

### 8. Optional artifact export (only on explicit user request)

If and only if the user explicitly asks for a written artifact, export to:

- `./.codex/artifacts/brainstorm/{feature-name}.md`

Include:

- `요청 대응표`
- `작업 묶음 표`
- `공개 surface 표`
- `상태 소유권 표` when relevant
- `제외 항목 표` when relevant
- `남은 질문 / 가정`
- `추천 다음 단계`

### 9. Quality gate before handoff

Before handoff, confirm:

- No hidden assumptions remain
- No blocking policy ambiguity remains for the chosen planning scope
- No touched public surface remains vague enough that implementation would have to guess
- No user-visible UI direction remains vague enough that planning would force later design guessing
- No exclusion was introduced without being made explicit
- The user's requested items are still traceable in the request-lock tables
- Blocking questions are explicit when another clarification round is still needed
- Recommended next step is clear

### 10. Handoff to `design-discovery` or `architect` (when needed)

If user-visible UI direction such as hierarchy, state presentation, responsive behavior, or design-system fit remains blocking:

- hand off the locked request scope to `design-discovery` before `architect`
- make the unresolved UI-direction questions explicit instead of burying them in prose

When planning is needed and scope is decision-complete enough for planning, provide:

1. The locked `요청 대응표`
2. The locked `작업 묶음 표`
3. The locked `공개 surface 표`
4. Any `상태 소유권 표` or `제외 항목 표` that matters to planning
5. Explicit defaults or deferred low-risk choices
6. Context7-confirmed external facts that `architect` should treat as already resolved, plus any still-risky assumptions that may require fallback verification

Do not hand off to `architect` while blocking ambiguity remains for a touched public surface, exclusion boundary, or user-visible UI direction that would force design guessing.

## Guardrails

- Do not write implementation plans or code.
- Do not skip approach comparison when meaningful tradeoffs exist.
- Do not hand off to `architect` with unresolved blocking ambiguity.
- Do not skip Context7 when library/framework/API documentation is the main source of the decision and Context7 is available.
- Do not present the main option comparison or request-lock snapshot only as loose bullet lists.
- Do not invent planner taxonomy as the primary way to describe the user's goal.
- Do not depend on `./.ai/` or other external AI metadata directories.
- Keep brainstorm-owned artifacts under `./.codex/`.
- If touched public props, callbacks, or state ownership are part of the request, lock them before handoff unless the user explicitly defers them.
- If user-visible UI direction is still materially under-specified, route to `design-discovery` before `architect`.
- If requirements are already clear, explicitly state skip reason and route to `architect` directly.
</Instructions>
</Skill_Guide>
