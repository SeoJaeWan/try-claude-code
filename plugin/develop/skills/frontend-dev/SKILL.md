---
name: frontend-dev
description: "React/Next.js/Expo development with UI components, custom hooks, and state management. Use for frontend UI, API integration, and mobile app development."
model: opus
context: fork
agent: frontend-developer
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

1. Read plan from `plans/{task-name}/plan.md` (if present)
2. Read `codemaps/frontend.md` (if present)
3. **Run Convention Discovery** (above) — scan existing code for patterns
4. Read project theme/style when the task includes UI work: `tailwind.config.*`, `app/globals.css`, component library tokens
5. Implement the required UI and logic, following discovered conventions exactly
6. **If visual reference provided**: Run Visual Reference Comparison loop (see below) — iterate until pixelmatch mismatch < 1%
7. If plan includes `tests/`: copy test files to source tree, run Red verification (`pnpm test`)
8. If plan includes `e2e/`: copy E2E test files (contract-first — do NOT modify)
9. Run tests: `pnpm test` — confirm ALL pass (Green)
10. If plan includes `e2e/`: `pnpm exec playwright test` — if E2E fails, fix implementation, NOT tests
11. Return results based on plan.md

## Visual Reference Comparison (optional)

Activated when a visual reference is provided (image file, live URL, or Figma export).
Runs after initial implementation (step 6) and before test execution.

### Reference Acquisition

| Source | How to obtain |
|---|---|
| Image file | User provides PNG/JPG directly, or plan includes reference image path |
| Live URL | `npx agent-browser open <url>` → `npx agent-browser screenshot reference.png` |
| Figma | Obtained via `figma-implement-design` skill — frame export as PNG |

### Prerequisites

Ensure `pixelmatch` and `pngjs` are available before running the comparison:

```bash
npm ls pixelmatch pngjs 2>/dev/null || npm install --save-dev pixelmatch pngjs
```

### Comparison Loop

1. **Capture current state**
   ```bash
   npx agent-browser open <dev-url>
   npx agent-browser screenshot current.png
   ```
   If the reference has a known viewport size, match it before capturing:
   ```bash
   npx agent-browser eval "document.documentElement.clientWidth + 'x' + document.documentElement.clientHeight"
   ```

2. **Run pixelmatch comparison**
   ```bash
   node <path-to-skill>/references/visual-compare.mjs reference.png current.png diff.png 0.1
   ```
   Output: JSON with `mismatchRate`, `passed`, `sizeMismatch`, and `diffImage` path.

3. **Evaluate result**
   - `passed: true` (mismatch < 1%) → comparison PASSED → exit loop
   - `passed: false` → continue to step 4

4. **Read diff.png** with the Read tool to view highlighted differences (red = mismatch)
   - Determine if differences are meaningful or rendering noise

5. **If meaningful differences** (layout shift, wrong color, missing element):
   - Identify the specific CSS/layout cause from the diff
   - Fix the code
   - Go to step 1

6. **If only rendering noise** (anti-aliasing, sub-pixel font rendering, < 0.5%):
   - Report as acceptable variance
   - Exit loop

### Integration with Figma MCP

When the reference comes from Figma via `figma-implement-design`:

1. Figma MCP provides design tokens (colors, spacing, typography) AND frame screenshot
2. Use the frame screenshot as `reference.png`
3. After implementation, run the comparison loop above
4. pixelmatch catches what token extraction alone misses:
   - Color values that render differently than Figma specifies
   - Spacing that compounds across nested elements
   - Font rendering differences (weight, line-height, letter-spacing)
   - Border-radius, shadow, and opacity subtleties

### Comparison thresholds

| Scenario | Threshold | Rationale |
|---|---|---|
| Figma pixel-perfect | `0.05` | Strictest — design spec must match exactly |
| General UI reference | `0.1` | Default — catches meaningful differences, ignores font rendering |
| Cross-browser baseline | `0.2` | Lenient — different engines render fonts/shadows differently |

Pass threshold as the 4th argument to `visual-compare.mjs`.

### What to avoid in visual comparison

- Do NOT modify reference images to match implementation — always fix the code
- Do NOT chase anti-aliasing differences below 0.5% mismatch rate — these are rendering engine artifacts
- Do NOT skip the pixelmatch gate and rely solely on visual inspection for pixel-level precision
- Do NOT install pixelmatch globally — use project devDependencies

## What to avoid

- Do NOT invent conventions that do not exist in the codebase — follow what is already there
- Do NOT put business/data logic (fetch, useQuery, useMutation) inside UI components when the project separates them into hooks
- Do NOT change existing file organization patterns to match some "ideal" structure
- Do NOT add libraries that are not already in `package.json` without asking

</Instructions>
</Skill_Guide>
