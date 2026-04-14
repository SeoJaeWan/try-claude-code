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
6. Run Visual Reference Comparison if triggered (see trigger conditions below)
7. If plan includes `tests/`: copy test files to source tree, run Red verification (`pnpm test`)
8. If plan includes `e2e/`: copy E2E test files (contract-first — do NOT modify)
9. Run tests: `pnpm test` — confirm ALL pass (Green)
10. If plan includes `e2e/`: `pnpm exec playwright test` — if E2E fails, fix implementation, NOT tests
11. Return results based on plan.md

## Visual Reference Comparison

### Trigger conditions (activate when ANY of these apply)

- User provides a reference image or URL
- User requests visual comparison between two screens or URLs
- User mentions "design diff", "compare", "audit", or "visual difference"

### Core idea

Compare at the DOM element level, not full-page level.
Capture only the target element from the reference and the implementation,
so size mismatches from page chrome, viewport differences, or surrounding
layout never pollute the comparison.

### Identify the comparison target

Before capturing anything, determine **what to compare**:

1. Read the task/plan to identify the target component or section
2. Choose a CSS selector that isolates it (e.g., `.hero-section`, `#pricing-table`, `[data-testid="card"]`)
3. If the reference URL and dev URL use different DOM structures, pick the most semantically equivalent selector for each

### Reference Acquisition

| Source | How to capture |
|---|---|
| Live URL | `npx agent-browser open <url>` → `npx agent-browser screenshot "<selector>" reference.png` |
| Image file | User provides PNG/JPG directly — use as-is (skip element capture) |

### Prerequisites

Ensure `pixelmatch` and `pngjs` are available before running the comparison:

```bash
npm ls pixelmatch pngjs 2>/dev/null || npm install --save-dev pixelmatch pngjs
```

### Mode A — Comparison only (no implementation)

Use when the user asks to compare, audit, or diff two screens without building anything.

1. **Capture both sides**
   ```bash
   npx agent-browser open <url-a>
   npx agent-browser screenshot "<selector>" side-a.png
   npx agent-browser open <url-b>
   npx agent-browser screenshot "<selector>" side-b.png
   ```

2. **Run pixelmatch comparison**
   ```bash
   node <path-to-skill>/references/visual-compare.mjs side-a.png side-b.png diff.png 0.1
   ```

3. **Report findings** — read diff.png, describe visual differences, report mismatch percentage. Do NOT proceed to implementation unless explicitly asked.

### Mode B — Post-implementation verification

Use when a visual reference is provided alongside an implementation task.
Runs after implementation (step 6) and before test execution.

#### Path B1 — Two-step capture (default)

Use when the reference URL and dev URL need different selectors or different viewport sizes.

1. **Capture reference element**
   ```bash
   npx agent-browser open <reference-url>
   npx agent-browser screenshot "<selector>" reference.png
   ```

2. **Capture current implementation element**
   ```bash
   npx agent-browser open <dev-url>
   npx agent-browser screenshot "<selector>" current.png
   ```

3. **Run pixelmatch comparison**
   ```bash
   node <path-to-skill>/references/visual-compare.mjs reference.png current.png diff.png 0.1
   ```

4. **Evaluate result**
   - `passed: true` (mismatch < 1%) → exit loop
   - `passed: false` → read diff.png, fix code, go to step 2

#### Path B2 — One-shot diff (shortcut)

Use when both URLs share the same selector and the reference is already captured as a baseline image.

```bash
npx agent-browser open <dev-url>
npx agent-browser diff screenshot --baseline reference.png --selector "<selector>" --output diff.png --threshold 0.1
```

#### Path B3 — Direct URL diff

Use when comparing two live URLs with the same selector and no pre-existing baseline.

```bash
npx agent-browser diff url <reference-url> <dev-url> --screenshot --selector "<selector>"
```

### Handling size differences

Element-level capture minimizes size mismatches, but they can still occur
(e.g., different font metrics, padding values). When `visual-compare.mjs`
reports `sizeMismatch: true`:

1. Check if the size difference is intentional (responsive breakpoint, different content length)
2. If unintentional — fix the implementation CSS, do NOT resize the reference
3. If intentional — match the viewport/conditions so both captures render at the same size

### Comparison thresholds

| Scenario | Threshold | Rationale |
|---|---|---|
| General UI reference | `0.1` | Default — catches meaningful differences, ignores font rendering |
| Pixel-perfect spec | `0.05` | Strictest — design spec must match exactly |
| Cross-browser baseline | `0.2` | Lenient — different engines render fonts/shadows differently |

Pass threshold as the 4th argument to `visual-compare.mjs`.

### What to avoid in visual comparison

- Do NOT compare full-page screenshots when the task targets a specific component — always scope to the element
- Do NOT modify reference images to match implementation — always fix the code
- Do NOT chase anti-aliasing differences below 0.5% mismatch rate — these are rendering engine artifacts
- Do NOT skip the pixelmatch gate and rely solely on visual inspection for pixel-level precision
- Do NOT install pixelmatch globally — use project devDependencies
- Do NOT fall back to computed style comparison when pixelmatch is available — pixelmatch is the ground truth for visual differences; computed styles do not guarantee rendering equivalence

## What to avoid

- Do NOT invent conventions that do not exist in the codebase — follow what is already there
- Do NOT put business/data logic (fetch, useQuery, useMutation) inside UI components when the project separates them into hooks
- Do NOT change existing file organization patterns to match some "ideal" structure
- Do NOT add libraries that are not already in `package.json` without asking

</Instructions>
</Skill_Guide>
