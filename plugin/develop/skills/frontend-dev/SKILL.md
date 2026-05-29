---
name: frontend-dev
description: "React/Next.js/Expo development with UI components, custom hooks, and state management. Use for frontend UI, API integration, and mobile app development. Use this skill for any task that involves creating or modifying React components, pages, hooks, styles, or frontend routing — even when the user just says 'add this to the UI', 'make this screen look like X', or 'wire up the API on the frontend'. Run inside the `frontend-developer` agent."
---

<Skill_Guide>
<Purpose>
React/Next.js/Expo development with UI components, custom hooks, and state management.
Use for frontend UI, API integration, and mobile app development.
</Purpose>

<Instructions>
# frontend-dev

Expert frontend workflow — UI components, hooks, state management, and API integration.

## Core Principle

**Frontend-dev owns both UI structure and frontend logic.**

- Create or update component files when the task includes layout, styling, responsive UI, or UI interaction state
- Create custom hooks and API hooks when the task includes reusable business/data logic or server-state integration
- If a component has inline logic that should be reused or tested separately, extract it into hooks before expanding the UI further

## Convention Discovery (do this before writing any code)

Every project has its own conventions — directory layout, naming style, import patterns,
file structure. Your job is to discover them from the existing code, not to guess or
impose defaults. Skip any step whose target does not exist in the project.

### 1. Detect the stack

Look for framework markers to understand what you are working with:

| File / Dir | Indicates |
|---|---|
| `next.config.*` | Next.js |
| `app/` dir with `layout.tsx` | Next.js App Router |
| `pages/` dir | Next.js Pages Router or plain React |
| `app.json` or `expo` key in package.json | Expo / React Native |
| `vite.config.*` | Vite-based React |
| `package.json` dependencies | React version, state libs, CSS approach |

### 2. Scan existing patterns

Read 2-3 representative examples of each file type that already exists in the project.
Extract the following conventions by observation — do not assume:

- **Directory structure**: Where do components, hooks, utils, types live?
- **File naming**: `index.tsx` vs `ComponentName.tsx`? camelCase vs PascalCase folders?
- **Export style**: default export or named export?
- **Function style**: arrow functions or function declarations?
- **Props pattern**: inline types, separate interface, or imported type?
- **State management**: which libraries are actually used? (TanStack Query, Zustand, Redux, Jotai, Context, etc.)
- **Styling approach**: Tailwind, CSS Modules, styled-components, etc.
- **Import patterns**: absolute paths (`@/`), relative paths, barrel exports?
- **Logic boundaries**: where does data-fetching live? In components, hooks, server actions?

### 3. Summarize conventions before implementing

Before writing any code, state the discovered conventions in 5-10 bullet points.
This ensures you and the project are aligned. If you cannot find enough examples
(e.g., greenfield project), fall back to the framework's official conventions.

## Implementation Steps

1. Read plan from `plans/<slug>.plan.md` or `plans/<slug>/plan.md` (if present)
2. Consult the project dev-wiki — follow `plugin/develop/references/dev-wiki-lookup.md` to narrow candidate files and pick up recorded conventions (skip silently if no wiki)
3. **If the task references a Figma URL** — run the Figma integration workflow (see section below) before Convention Discovery
4. **Run Convention Discovery** (above) — scan existing code for patterns
5. Read project theme/style when the task includes UI work: `tailwind.config.*`, `app/globals.css`, component library tokens
6. Implement the required UI and logic, following discovered conventions exactly
7. If plan includes `tests/`: copy test files to source tree, run Red verification (`pnpm test`)
8. If plan includes `e2e/`: copy E2E test files (contract-first — do NOT modify)
9. Run tests: `pnpm test` — confirm ALL pass (Green)
10. If plan includes `e2e/`: `pnpm exec playwright test` — if E2E fails, fix implementation, NOT tests
11. Return results based on plan.md

## Figma integration (read-only)

When the task references a Figma URL (`figma.com/design/...`, `figma.com/make/...`), pull the design context via the Figma MCP server and adapt it to the project's stack — never copy the returned code as-is.

### 1. Parse the URL

- `figma.com/design/:fileKey/:fileName?node-id=:nodeId` → convert `-` to `:` in nodeId
- `figma.com/design/:fileKey/branch/:branchKey/:fileName` → use branchKey as fileKey
- `figma.com/make/:makeFileKey/:makeFileName` → use makeFileKey
- `figma.com/board/:fileKey/...` → FigJam board, not supported here — ask the user for a design URL instead

### 2. Fetch design context (primary)

Call `mcp__plugin_figma_figma__get_design_context` with the parsed fileKey and nodeId. This is the primary entry point — it returns a code reference, a screenshot, and contextual hints (Code Connect mappings, token variables, component docs, annotations).

**The returned React+Tailwind code is a REFERENCE, not final code.** Always adapt it to the target project:

- If the project uses styled-components / CSS Modules / Emotion — translate the styling approach
- If the project uses a different component library — map to the project's primitives
- If the project does not use Tailwind — convert utility classes to the project's styling system

### 3. Prefer existing project components

Before writing new components, check for reusable ones already in the project:

- `mcp__plugin_figma_figma__get_code_connect_map` — returns Code Connect mappings (Figma component → codebase component). If a mapping exists, use the mapped component directly instead of generating new code
- `mcp__plugin_figma_figma__search_design_system` — search the project's design system library in Figma for components that match the intent
- `mcp__plugin_figma_figma__get_context_for_code_connect` — when you need more detail on a Code Connect mapping before using it

### 4. Map design tokens to project tokens

Call `mcp__plugin_figma_figma__get_variable_defs` to extract the node's variable/token definitions (colors, spacing, typography). Map these to the project's token system:

- Tailwind projects → map to `tailwind.config.*` theme tokens
- CSS variable projects → map to `:root` CSS custom properties
- Never hardcode hex values or pixel numbers when a matching token exists in the project

If the Figma token has no project counterpart, flag it and ask whether to add a new token or approximate with an existing one.

### 5. Supplementary reads (use sparingly)

- `mcp__plugin_figma_figma__get_screenshot` — pull the node image when you need to eyeball the design alongside the code reference (e.g., disambiguate layout intent)
- `mcp__plugin_figma_figma__get_metadata` — node structure when `get_design_context` doesn't give enough hierarchy detail
- `mcp__plugin_figma_figma__get_libraries` — lists connected libraries when determining which design system to search

### 6. What not to do

- Do NOT copy the returned React+Tailwind code verbatim — adapt to the project stack
- Do NOT create a new component when Code Connect or design-system search returns a usable match
- Do NOT use write/create Figma tools (`create_*`, `generate_*`, `use_figma`, `send_code_connect_mappings`) — this agent is read-only toward Figma
- Do NOT authenticate via MCP from inside this agent — if auth is missing, stop and ask the user to complete auth in the main session
- Do NOT use Figma MCP for FigJam (`get_figjam`) — FigJam is a whiteboard, not a design source for implementation

## What to avoid

- Do NOT invent conventions that do not exist in the codebase — follow what is already there
- Do NOT put business/data logic (fetch, useQuery, useMutation) inside UI components when the project separates them into hooks
- Do NOT change existing file organization patterns to match some "ideal" structure
- Do NOT add libraries that are not already in `package.json` without asking

</Instructions>
</Skill_Guide>
