---
name: ui-publish
description: Create or refine visual UI structure after scope is fixed. Use when a request involves React or Next.js components, layouts, pages, responsive styling, design-system variants, spacing, typography, tokens, or presentational refactors that should not contain business logic. Trigger for component and layout files owned by publisher where the output should be visual-only or expose props for later logic wiring.
---

<Skill_Guide>
<Purpose>
Build production-ready presentational UI without absorbing business logic.
</Purpose>

<Instructions>
# ui-publish

Use this skill for visual phases owned by `publisher`.

## Inputs to inspect

1. The active request and latest conversation context
2. `plans/{task-name}/plan.md` or the assigned track plan when a plan exists
3. `codemaps/frontend.md` when present
4. Existing design system, component library, `tailwind.config.*`, and global styles
5. Active `tcp` help for command discovery, scaffold shape, and validation rules

## Workflow

### Step 0. Confirm the boundary

- Own layout, responsive behavior, presentational component structure, styling, and visual polish.
- Allow local interaction state that exists only to present UI, such as open or closed panels, tabs, or menus.
- Leave API calls, form submission logic, auth, filtering, persistence, and domain rules to `frontend-dev` or `backend-dev`.

### Step 1. Read the visual contract

- Read the assigned plan before editing when a plan exists.
- Read only the local theme and component context needed to implement the requested surface.
- Preserve established visual language when the repo already has one.

### Step 2. Resolve the active `tcp` contract

- Run `tcp --help` only when command discovery is needed.
- Then inspect only the relevant command-scoped help.
- Treat `tcp` output as the current source of truth for naming, file placement, scaffolding, and validation.
- Do not guess component conventions from old examples.

### Step 3. Implement the UI

- Build visual structure first and expose data-dependent behavior via props or slots.
- Keep components easy for `frontend-dev` to wire later.
- Preserve accessibility basics such as labels, semantics, and keyboard-relevant affordances.
- Prefer incremental refactors over broad visual rewrites unless the plan explicitly calls for redesign.

### Step 4. Handle tests

- If the plan includes frozen E2E artifacts, implement the UI so those locators and outcomes remain valid.
- Do not rewrite the planned contracts to fit the component.

### Step 5. Validate

- Run the relevant UI verification for the affected scope.
- Run `tcp validate-file` on every created or modified UI file.
- Fix reported violations and re-run validation until clean.

## Guardrails

- Do not add business logic or data fetching.
- Do not hide required callback or prop seams behind local data mocks.
- Do not skip `tcp` validation.
- Do not replace established project tokens or conventions without an explicit reason.

## Output contract

- Return changed files, executed validations, and any handoff points for `frontend-dev`.
- Call out any deliberate placeholder props or state seams added for later logic wiring.
</Instructions>
</Skill_Guide>
