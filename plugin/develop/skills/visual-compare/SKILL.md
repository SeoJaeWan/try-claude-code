---
name: visual-compare
description: "Visual comparison using pixelmatch and agent-browser. Captures element screenshots, runs pixel-level diff, and reports mismatch. Use for design diff, visual audit, screenshot comparison, verifying UI implementation against reference images, or comparing two URLs visually. Triggers on: reference image comparison, 'does this match the design', Figma/design spec verification, before-after UI comparison, 화면 비교, 디자인 비교, 스크린샷 비교. Use this skill even when the user just provides two images or URLs and asks what's different."
model: sonnet
context: fork
agent: visual-comparator
---

<Skill_Guide>
<Purpose>
Pixel-level visual comparison between reference images and live UI.
Uses agent-browser for screenshot capture and pixelmatch for diff analysis.
</Purpose>

<Instructions>
# visual-compare

Dedicated visual comparison workflow — screenshot capture, pixel diff, and mismatch reporting.

## Workflow

### Step 1 — Identify inputs and validate sources

Determine the two sides to compare:

| Scenario | Side A (reference) | Side B (current) |
|---|---|---|
| Image file + URL | User-provided image | Screenshot from URL |
| Two URLs | Screenshot from URL A | Screenshot from URL B |
| Two image files | Image file A | Image file B |
| URL + selector | Screenshot of element A | Screenshot of element B |

**Reference source rule — self-compare is invalid:**

Reference and current must come from independent sources. A comparison is meaningless if both sides originate from the same system (e.g., one Storybook story used as reference for another story in the same Storybook). Valid reference sources include:

- A live production or staging URL (external)
- A local dev server running a *different* codebase from the implementation under test
- A user-provided image file (e.g., Figma export, design spec, prior screenshot)

If the only available reference is from the same system as current (same Storybook, same test harness), surface this to the user before proceeding. Capturing both sides from the same system produces a decorator/layout diff, not an acceptance check.

**Multi-case inventory:**

When comparing multiple states (e.g., 8 context menu cases), establish the full case list upfront. Every case must have a real screenshot triplet (reference, current, diff) before the report is considered complete. Source code analysis is not a substitute for pixel comparison — it cannot catch rendering differences.

### Step 2 — Capture screenshots

Do NOT take full-page or viewport-level screenshots.
Always capture only the target element via CSS selector.

**Basic capture:**

1. Identify the target element with a CSS selector (e.g., `.hero-section`, `#pricing-table`, `[data-testid="card"]`, `.w-[200px]`)
2. If a reference image exists, read its dimensions first
3. Match viewport width to reference image width before capturing

```bash
npx agent-browser set viewport <reference-width> <reference-height>
npx agent-browser open <url>
npx agent-browser screenshot "<selector>" <output.png>
```

**State seeding (when required):**

Some states cannot be captured without seeding application state. Always seed rather than skip.

```bash
# localStorage seeding via page evaluate
npx agent-browser open <url>
npx agent-browser evaluate "localStorage.setItem('key', JSON.stringify(value))"
npx agent-browser open <url>  # reload to apply seeded state
npx agent-browser screenshot "<selector>" <output.png>
```

Common cases requiring seeding:
- **localStorage-gated state**: pinned items, user preferences, session data — seed the key before navigating
- **Interaction-triggered UI** (context menus, tooltips, dropdowns): dispatch the triggering event programmatically after opening the page
  ```bash
  npx agent-browser evaluate "document.querySelector('<selector>').dispatchEvent(new MouseEvent('contextmenu', {bubbles:true}))"
  npx agent-browser wait "<context-menu-selector>"
  npx agent-browser screenshot "<context-menu-selector>" <output.png>
  ```
- **Cookie/auth state**: inject via evaluate before reload

If seeding fails or the state cannot be reproduced, document the obstacle and ask the user for guidance — do NOT fall back to source code analysis as a substitute for a real screenshot.

### Step 3 — Artifact naming

For each comparison case, produce exactly three files using a shared `{kind}-{state}` key:

```
{kind}-{state}-reference.png
{kind}-{state}-current.png
{kind}-{state}-diff.png
```

The key must be identical across all three files for the same case. The `kind` identifies the component surface (e.g., `windows-panel-context`, `search-panel-context`) and `state` identifies the specific fixture (e.g., `pinned-2025`, `all-unpinned-reference`).

Example for case "Windows panel context menu — pinned item at position 0":
```
windows-panel-context-pinned-2025-reference.png
windows-panel-context-pinned-2025-current.png
windows-panel-context-pinned-2025-diff.png
```

### Step 4 — Run pixelmatch comparison

Ensure dependencies are available:

```bash
npm ls pixelmatch pngjs 2>/dev/null || npm install --save-dev pixelmatch pngjs
```

Run the comparison script:

```bash
node <path-to-this-skill>/references/visual-compare.mjs \
  {kind}-{state}-reference.png \
  {kind}-{state}-current.png \
  {kind}-{state}-diff.png \
  <threshold>
```

### Step 5 — Analyze and report

1. Parse the JSON output from the comparison script
2. Read `{kind}-{state}-diff.png` to understand **where** the mismatches are
3. For each case, report:
   - Mismatch percentage and pixel count
   - Whether dimensions matched (size diff is often the first signal of a layout bug)
   - Description of visual differences (location, nature — e.g., "button text shifted 2px left", "background color differs in header")
   - Pass/fail determination

**When mismatch is systematic across many cases:**

If the same percentage (~8-9%) appears consistently across all cases, the root cause is almost certainly a global style difference rather than a per-case bug. Supplement the pixel diff report with a CSS property comparison:

| Property | Reference | Current | Delta |
|---|---|---|---|
| background | `bg-gray-50` | `bg-gray-50/95` | opacity + blur added |
| border-radius | `rounded-md` (6px) | `rounded-lg` (8px) | 2px larger |
| row padding | `py-1` (4px) | `py-1.5` (6px) | 2px taller rows |
| font size | `text-sm` (14px) | `text-xs` (12px) | 2px smaller text |

This table makes it immediately clear what needs to change to reach pixel parity.

### Step 6 — Act based on mode

**Mode A — Report only (default)**

When the user asks to compare, audit, or diff without an implementation task:

1. Complete Steps 1-5
2. Present the comparison report
3. Do NOT modify any code unless explicitly asked

**Mode B — Verification (reference image provided with implementation URL)**

When the user provides both a reference and a live implementation to verify:

1. Complete Steps 1-5
2. If `passed: true` (mismatch < threshold) — report success
3. If `passed: false` — report the specific visual differences found in diff images with actionable details
4. Do NOT fix code — this skill only captures, compares, and reports

**Mode C — Dedicated plan phase**

When `architect` split visual verification into its own phase:

1. Complete Steps 1-5
2. Write repo-local artifacts for the phase: captured images, diff images, and a markdown or JSON report in the phase-defined artifact path
3. Return a pass/fail result plus mismatch details that a later `frontend-developer` phase can consume
4. Do NOT modify product source files in this phase

## Comparison thresholds

| Scenario | Threshold | When to use |
|---|---|---|
| General UI reference | `0.1` | Default — catches meaningful differences, ignores font rendering artifacts |
| Element-level external reference | `0.2` | When reference is captured from a different rendering environment (OS, browser engine) |
| Pixel-perfect spec | `0.05` | Strictest — Figma/design spec must match exactly |

Use `0.1` unless context implies otherwise. When reference and current are captured from different systems (e.g., blog localhost vs Storybook), `0.2` is appropriate because font rendering and subpixel differences are expected.

## What to avoid

- Do NOT use the same Storybook (or test harness) as both reference and current source — this is a self-compare and produces no meaningful acceptance signal
- Do NOT substitute source code analysis for real screenshots when state is hard to capture — seed the state instead
- Do NOT produce a partial report where some cases have real screenshots and others only have source analysis — all cases must have a real triplet
- Do NOT use inconsistent file naming — `{kind}-{state}` key must be identical across reference, current, and diff
- Do NOT modify or resize reference images to match implementation — the code or viewport must be adjusted instead
- Do NOT chase anti-aliasing differences below 0.5% mismatch rate — these are rendering engine artifacts
- Do NOT skip the pixelmatch gate and rely solely on visual inspection or computed styles
- Do NOT install pixelmatch globally — use project devDependencies
- Do NOT take full-page screenshots — always capture the specific target element
- Do NOT proceed to code changes in Mode A — report only unless explicitly asked to fix
- Do NOT fix visual mismatches inside a dedicated `visual-comparator` phase — hand them off to a later `frontend-developer` phase

## agent-browser reference

See `references/agent-browser-patterns.md` for the CLI commands relevant to visual comparison (screenshot, viewport, element info, evaluate).

</Instructions>
</Skill_Guide>
