---
name: visual-compare
description: "Visual comparison using pixelmatch and agent-browser. Captures element screenshots, runs pixel-level diff, and reports mismatch. Use for design diff, visual audit, screenshot comparison, 화면 비교, 디자인 비교, 스크린샷 비교."
model: opus
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

## When this skill activates

- User provides a reference image (file path or URL) and asks to compare against live UI
- User requests comparison between two URLs or two images
- User mentions "design diff", "compare", "audit", "visual difference", "화면 비교", "디자인 비교"
- A plan assigns a dedicated `visual-comparator` phase after UI implementation

## Workflow

### Step 1 — Identify inputs

Determine the two sides to compare:

| Scenario | Side A (reference) | Side B (current) |
|---|---|---|
| Image file + URL | User-provided image | Screenshot from URL |
| Two URLs | Screenshot from URL A | Screenshot from URL B |
| Two image files | Image file A | Image file B |
| URL + selector | Screenshot of element A | Screenshot of element B |

### Step 2 — Capture screenshots (skip if both sides are image files)

Do NOT take full-page or viewport-level screenshots.
Always capture only the target element via CSS selector.

1. Identify the target element with a CSS selector (e.g., `.hero-section`, `#pricing-table`, `[data-testid="card"]`)
2. If a reference image exists, read its dimensions first
3. Match viewport width to reference image width before capturing — this ensures responsive components render at the same breakpoint

```bash
npx agent-browser open <url> --viewport-width <reference-width>
npx agent-browser screenshot "<selector>" <output.png>
```

4. If the user provides an image file directly, use it as-is (skip capture for that side)
5. If no explicit selector is given, ask the user or infer from context (e.g., the main content area, a specific component)

### Step 3 — Run pixelmatch comparison

Ensure dependencies are available:

```bash
npm ls pixelmatch pngjs 2>/dev/null || npm install --save-dev pixelmatch pngjs
```

Run the comparison script:

```bash
node <path-to-this-skill>/references/visual-compare.mjs <sideA.png> <sideB.png> diff.png <threshold>
```

### Step 4 — Analyze and report

1. Parse the JSON output from the comparison script
2. Read `diff.png` to understand **where** the mismatches are (the diff image highlights mismatched pixels in red)
3. Report findings:
   - Mismatch percentage and pixel count
   - Whether dimensions matched
   - Description of the visual differences (location, nature — e.g., "the button text is shifted 2px left", "the background color differs in the header")
   - Pass/fail determination

### Step 5 — Act based on mode

**Mode A — Report only (default)**

When the user asks to compare, audit, or diff without an implementation task:

1. Complete Steps 1-4
2. Present the comparison report
3. Do NOT modify any code unless explicitly asked

**Mode B — Verification (reference image provided with implementation URL)**

When the user provides both a reference and a live implementation to verify:

1. Complete Steps 1-4
2. If `passed: true` (mismatch < threshold) — report success
3. If `passed: false` — report the specific visual differences found in diff.png with actionable details (what differs, where, by how much)
4. Do NOT fix code — this skill only captures, compares, and reports

**Mode C — Dedicated plan phase**

When `architect` split visual verification into its own phase:

1. Complete Steps 1-4
2. Write repo-local artifacts for the phase: captured images, `diff.png`, and a markdown or JSON report in the phase-defined artifact path
3. Return a pass/fail result plus mismatch details that a later `frontend-developer` phase can consume
4. Do NOT modify product source files in this phase

## Comparison thresholds

| Scenario | Threshold | When to use |
|---|---|---|
| General UI reference | `0.1` | Default — catches meaningful differences, ignores font rendering artifacts |
| Pixel-perfect spec | `0.05` | Strictest — Figma/design spec must match exactly |
| Cross-browser baseline | `0.2` | Lenient — different engines render fonts/shadows differently |

Use `0.1` unless the user specifies otherwise or the context implies a different level of strictness.

## What to avoid

- Do NOT modify or resize reference images to match implementation — the code or viewport must be adjusted instead
- Do NOT chase anti-aliasing differences below 0.5% mismatch rate — these are rendering engine artifacts
- Do NOT skip the pixelmatch gate and rely solely on visual inspection or computed styles
- Do NOT install pixelmatch globally — use project devDependencies
- Do NOT fall back to computed style comparison — pixelmatch is the ground truth for visual differences
- Do NOT take full-page screenshots — always capture the specific target element
- Do NOT proceed to code changes in Mode A — report only unless explicitly asked to fix
- Do NOT fix visual mismatches inside a dedicated `visual-comparator` phase — hand them off to a later `frontend-developer` phase

## agent-browser reference

See `references/agent-browser-patterns.md` for full CLI command reference, snapshot/ref system, and token-efficient exploration patterns.

</Instructions>
</Skill_Guide>
