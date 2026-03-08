---
name: brainstorm
description: Codex entry skill for decision-focused clarification and option exploration. Asks targeted questions to confirm user intent before planning.
---

<Skill_Guide>
<Purpose>
Clarify ambiguous requests with focused brainstorming, tradeoff comparison, and confirmation questions before planning.
</Purpose>

<Instructions>
# brainstorm

Use this as the entrypoint when ambiguity can change architecture, scope, tooling, API contracts, UX, or delivery strategy.

## When to use

- Request is ambiguous: "add login", "make dashboard", "improve UX".
- Multiple approaches are plausible and tradeoffs matter.
- Library/framework/pattern choices need to be made.
- Acceptance criteria are missing or vague.
- The user wants clarification questions before committing to a plan.

## When not to use

- Request is already decision-complete with clear scope and acceptance criteria.
- Task is straightforward with no meaningful tradeoff.

## Workflow

### 1. Analyze request

Identify what is clear vs unclear:
- Required outcomes and constraints
- Missing decisions
- Plausible architecture/library branches

### 2. Gather local context

Read only what is needed:
- `./.ai/references/domain.md` for business context
- `./.ai/codemaps/` for current structure (if present)
- Other relevant references under `./.ai/references/`

### 3. Research latest information when needed

If technical choices depend on external facts (library/API/pattern changes), gather current information before asking for decisions.
If reliable research tooling is unavailable, state that clearly and ask the user to confirm assumptions.

### 4. Compare approaches (required)

Always present 2-3 options with tradeoffs.
For each option include:
- Pros
- Cons
- Risks
- Implementation cost

Then recommend one option with concise rationale (YAGNI, maintainability, delivery risk).

### 5. Ask confirmation-focused questions

Ask only unresolved high-impact questions.
Rules:
- Max 4 questions at once
- Questions must be actionable
- Do not ask what can be derived from local context
- Questions should help the user confirm scope and direction quickly

### 6. Produce decision snapshot (default)

Return a concise decision snapshot in the response:
- Confirmed choices
- Deferred choices
- Key assumptions
- Recommended next step (`architect` or direct execution)

Do not create a requirements artifact by default.

### 7. Optional artifact export (only on explicit user request)

If and only if the user explicitly asks for a written artifact, export to:
- `./.ai/requirements/{feature-name}.md`

Include:
- Background
- Goals
- Non-goals
- Scope
- Constraints
- Functional requirements
- Non-functional requirements
- Acceptance criteria
- Open questions and assumptions

### 8. Quality gate before handoff

Before handoff, confirm:
- No hidden assumptions remain
- Blocking questions are explicit
- Recommended next step is clear

### 9. Handoff to architect (when needed)

When planning is needed, provide:
1. Summary of confirmed decisions
2. Remaining blocked decisions (if any)
3. Suggested planning scope boundaries

## Guardrails
- Do not write implementation plans or code.
- Do not skip approach comparison when meaningful tradeoffs exist.
- If requirements are already clear, explicitly state skip reason and route to `architect` directly.
</Instructions>
</Skill_Guide>
