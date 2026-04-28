# Brainstorm Guardrails

## Guardrails

- Do not write implementation plans or code.
- Do not skip approach comparison when meaningful tradeoffs exist.
- Do not present a request as planning-ready with unresolved blocking ambiguity.
- Do not skip Context7 when library/framework/API documentation is the main source of the decision and Context7 is available.
- Do not present the main option comparison or request-lock snapshot only as loose bullet lists.
- Do not invent planner taxonomy as the primary way to describe the user's goal.
- Do not depend on `./.ai/` or other external AI metadata directories.
- Keep brainstorm-owned artifacts under `./.codex/`.
- Do not let review wiki preflight expand `brainstorm` into phase topology, execution routing, or review-authoring work.
- If touched public props, callbacks, or state ownership are part of the request, lock them before handoff unless the user explicitly defers them.
- If user-visible UI direction is still materially under-specified, state that `locked_ui_direction` is required before planning.
- If requirements are already clear, explicitly state why no request-scope lock is needed and mark the request `ready_for_planning` or `ready_for_direct_execution`.
