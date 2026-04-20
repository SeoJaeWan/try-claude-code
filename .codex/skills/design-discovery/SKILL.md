---
name: design-discovery
description: Codex entry skill for optional upstream UI direction discovery before planning. Use when a request changes user-visible screens, pages, components, layout, information hierarchy, interaction states, or responsive behavior and the UI direction is not locked enough for `architect` to write a stable plan. Run consultation mode first to define the visual/system direction and state expectations, then use shotgun mode only when multiple concrete UI directions still remain.
---

<Skill_Guide>
<Purpose>
Lock user-visible UI direction after `brainstorm` and before `architect` so planning does not guess hierarchy, state presentation, responsive behavior, or design-system alignment.
</Purpose>

<Instructions>
# design-discovery

Use this skill only when UI direction needs to be made concrete before planning.
This skill is intended for explicit manual invocation, not as a default planning step for every request.

## When to use

- A request changes user-visible screens, pages, components, layouts, or interaction states.
- `brainstorm` clarified the product scope, but the UI direction is still too fuzzy for `architect`.
- Multiple plausible visual or hierarchy directions remain.
- The user wants to compare UI directions before committing to a plan.
- The current ambiguity is about what the user should see, not about backend behavior alone.

## When not to use

- The request is backend-only, API-only, data-only, or infrastructure-only.
- The existing design direction is already fixed enough that `architect` can plan safely.
- The task is a post-implementation live-site audit or fix loop.
- The real blocker is product scope or policy ambiguity that should go back to `brainstorm`.

## Workflow

### 1. Inspect the minimum local context

Read only what is needed:

- Latest user request and latest conversation context
- Any `brainstorm` handoff already produced in the current thread
- Relevant local UI code, routes, components, or screens inferred from the request
- Existing design-system or brand constraints when present
- Existing screenshots, referenced mockups, or directly relevant prior `./.codex/artifacts/design-discovery/**` artifacts when they reduce repeated discovery

Rules:

- Stay focused on the user-visible scope that planning would otherwise guess.
- If the problem definition itself is unstable, stop and route back to `brainstorm`.
- Do not perform a full live-site audit in this skill.

### 2. Run consultation mode first (required)

Lock the direction in words before generating variants:

- touched surfaces and user journeys
- primary information hierarchy
- key actions and interaction emphasis
- empty / loading / error / success state expectations
- responsive and accessibility expectations that materially affect planning
- reuse vs new-pattern expectations
- design-system, tone, or visual constraints that `architect` must preserve

Rules:

- Ask only high-impact questions that materially change the plan.
- Prefer concrete UI outcomes over abstract design jargon.
- Keep the result tight enough that `architect` can compress it into existing plan tables without adding new top-level sections.

### 3. Decide whether shotgun mode is needed

Use shotgun mode only when:

- materially different UI directions still remain after consultation mode
- or the user explicitly wants concrete variants before planning

Skip shotgun mode when one direction is already stable enough for planning.

### 4. Run shotgun mode (conditional)

When shotgun mode runs:

- compare 2-4 distinct directions at the same product surface
- keep the product goal constant while varying hierarchy, density, emphasis, composition, or tone
- if concrete mockup or image-generation capability is available in the current runtime, use it
- otherwise present the variants as a compact comparison table with concrete visual deltas

For each direction include:

- what the user sees first
- what interaction or state emphasis changes
- implementation cost / risk
- why it is stronger or weaker for this request

Then recommend one direction and note the fallback.

### 5. Produce the design-direction snapshot

Return a concise snapshot using markdown tables.

Required tables:

1. `UI 방향 요약 표`
   - `surface`
   - `이번에 고정한 방향`
   - `architect 반영 메모`
   - `남은 미결정`

2. `상태/표현 규칙 표`
   - `상태 또는 상황`
   - `사용자가 보게 될 것`
   - `계획에 반영할 규칙`
   - `비고`

3. `디자인 시스템/제약 표`
   - `항목`
   - `이번 결정`
   - `이유`
   - `적용 범위`

Optional when shotgun mode ran:

4. `변형 비교 표`
   - `방향`
   - `핵심 차이`
   - `장점`
   - `리스크`
   - `추천 여부`

Then include:

- `남은 질문` if blocking UI-direction ambiguity remains
- `추천 다음 단계` (`architect` or `brainstorm`)

### 6. Optional artifact export (only on explicit user request)

If and only if the user explicitly asks for a written artifact, export to:

- `./.codex/artifacts/design-discovery/{feature-name}.md`

Include:

- `UI 방향 요약 표`
- `상태/표현 규칙 표`
- `디자인 시스템/제약 표`
- `변형 비교 표` when shotgun mode ran
- approved visual references or notes when present
- `남은 질문 / 가정`
- `추천 다음 단계`

### 7. Handoff to architect

When planning should continue, hand off:

1. locked UI surfaces and journeys
2. the approved hierarchy and emphasis rules
3. state-presentation expectations for empty / loading / error / success flows
4. responsive, accessibility, and reuse constraints that materially affect planning
5. approved visual references or variant notes when present
6. explicit low-risk defaults vs still-blocking UI questions

Do not hand off to `architect` while blocking UI-direction ambiguity remains.

## Guardrails

- Consultation mode comes before shotgun mode.
- Do not write implementation code or source-tree tests.
- Do not create `DESIGN.md` by default.
- Do not turn this skill into a live-site audit or post-implementation fix loop.
- Do not route backend-only work here.
- Do not invent a new design system when existing constraints already settle the decision.
- Do not let implementation-time design guessing survive for key hierarchy, state presentation, or responsive behavior.
- If the real blocker is scope, policy, or product framing, route back to `brainstorm`.
- Keep the output concise, table-heavy, and in Korean.
</Instructions>
</Skill_Guide>
