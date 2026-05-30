# Plan Maker Guardrails

## Guardrails

- Do not write implementation code, source-tree tests, or runtime helper files.
- Do not write executable plan files until `blocking` product, UX, contract, validation, state, permission, and execution-area ambiguity is resolved.
- Do not invent execution areas that the upstream request lock did not include.
- Do not create a plan file for an excluded area.
- Do not use a plan file as a container for multiple execution agents.
- Do not rely on `shared-contract.md`, linked phase detail files, or external planning notes to complete a plan's execution meaning.
- Do not duplicate the active plan wiki plan artifact contract inside skill prose; read and apply the wiki contract.
- Do not leave product behavior, public boundaries, exclusions, canonical outputs, negative outputs, recipients, state ownership, no-op rules, or verification ownership implicit when later agents would have to guess.
- Do not create a test-only plan unless the active routing catalog contains a real execution agent for that responsibility and the upstream lock selected it.
- Do not make future source paths, route paths, or test paths look committed unless the plan intentionally locks that topology from actual repo inspection.
- Do not invent topology from framework memory alone; inspect the relevant local route, component, API, service, utility, test, fixture, or package boundary first.
- Do not treat dev wiki as a replacement for source inspection. If `dev_wiki_root` conflicts with current source, config, scripts, or tests, treat the wiki as possibly stale and record the conflict instead of silently planning from it.
- Do not edit dev wiki files from `plan-maker`; use them only as read-only project context.
- Do not turn missing Figma, external reference, inventory, classification, or fixture authority into an implementation phase when that authority changes the plan boundary or validation scope.
- Do not present HTML/JS evidence as production code. Evidence is a planning-only projection of the plan contract and must not require real API calls, DB access, filesystem writes, live dev servers, React builds, or production stack execution.
- Do not present planning docs UI evidence as final visual quality. Default to labeled wireframes, and route brand, landing, Figma, design-system parity, or component polish claims to reference authority plus implementation-time validation.
- Do not treat Context7 as mandatory for every plan; use it only when unstable external facts can change the boundary, contract, or plan split.
- Do not treat old `plan.md + phases/*` artifacts as the current contract unless the task is explicitly a legacy migration or review.
- Do not bypass Korean-first visible prose and terminology checks.
