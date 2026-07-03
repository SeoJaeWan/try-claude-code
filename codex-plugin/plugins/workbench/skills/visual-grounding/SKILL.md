---
name: visual-grounding
description: Visual grounding workflow for UI implementation work. Use when the user wants Codex to compare a Figma frame, source website, or reference screenshot against a local implementation route so the AI can identify actionable visual differences and fix likely UI issues. Triggers include "visual grounding", "visual compare", "Figma와 비교", "원본 UI와 비교", "현재 구현 화면 비교", "디자인 보고 수정", or when a frontend task has a clear source UI and target route.
---

# Visual Grounding

Use this skill to help Codex see what to fix in UI work by building a grounded evidence package: source UI evidence, target implementation evidence, matched regions, difference candidates, confidence, and code/selector hints.

This is not a pixel-perfect approval gate. The goal is to produce a small set of findings that are specific enough for an implementation agent to act on.

## Core Rules

- Do NOT rely on screenshots alone when structured evidence is available.
- Do NOT claim a visual issue is actionable unless it has a source region, target region, and likely code/selector hint.
- Do NOT auto-fix low-confidence differences, anti-aliasing noise, data mismatch, or intentional product copy/content differences.
- Do NOT compare unrelated states. Align route, viewport, theme, auth, data state, modal/open/selected state, and scroll position first.
- Do NOT turn every pixel mismatch into a finding. Report the few differences that affect layout, hierarchy, usability, or design fidelity.
- Prefer High/Medium confidence findings. Put uncertain observations in `Notes` or `Open Questions`.
- If the source and target cannot be aligned enough for useful comparison, stop with a blocked report and name the missing input.

## Inputs

Identify:

- Source UI: Figma URL/node, production/source URL, or image file.
- Target UI: local URL/route, app command if needed, viewport, and state setup.
- Scope: entire page, one frame/section, modal, component, responsive breakpoint, or specific visual concern.
- Constraints: whether Codex may modify code after the report, whether to inspect only, and which differences are intentionally accepted.

If source and target mapping is unclear, ask for the missing mapping before doing visual work. The minimum useful mapping is:

```json
{
  "source": "Figma URL, source URL, or image path",
  "target": "local URL or route",
  "viewport": { "width": 1440, "height": 900 },
  "state": "default / selected tab / modal open / logged-in fixture"
}
```

## Evidence Collection

### Source: Figma

When the source is Figma:

1. Parse the file key and node id from the Figma URL.
2. Use Figma read tools when available:
   - `get_design_context` for component hierarchy, tokens, annotations, and implementation hints.
   - `get_screenshot` for the visual reference image.
   - `get_metadata` only when hierarchy or bounds are missing.
   - `get_variable_defs` when token/color/typography comparison matters.
3. Record frame name, dimensions, important layer names, visible text, component states, tokens, and screenshot path.
4. Treat Figma code output as reference only. The target project's conventions still win.

### Source: Website

When the source is a real website:

1. Use browser automation to open the source URL at the requested viewport.
2. Freeze or normalize common noise when possible: motion, time, random data, cookie banners, hover state, scroll position.
3. Capture screenshot and collect DOM evidence for visible key elements:
   - text/role/aria-label
   - bounding boxes
   - computed font, color, background, border, radius, spacing where useful

### Source: Image

When the source is an image file:

1. Use it as visual reference.
2. Do not invent layer metadata. Findings from image-only sources must be lower confidence unless target DOM evidence makes the fix obvious.

### Target: Local Implementation

For the target route:

1. Start or reuse the local dev server when needed.
2. Open the target route at the same viewport and state.
3. Capture a screenshot.
4. Collect DOM evidence for likely regions:
   - landmarks, headings, buttons, links, inputs, cards, tabs, table headers, empty states, visible labels
   - bounding boxes and computed styles
   - source file hints from framework conventions, component names, route files, class names, test ids, and imports
5. If Playwright/browser tooling is unavailable, still collect repository evidence and screenshots by the best available method, but mark DOM evidence as missing.

## Region Matching

Build a small source-to-target mapping before analysis. Match by:

- visible text, normalized labels, aria labels, and role
- relative position and size
- component/layer names from Figma
- DOM selectors, test ids, class names, component names
- visual grouping, such as header, toolbar, card, list row, empty state, modal footer

Only analyze regions that can be matched or whose absence is obvious.

Use this confidence scale:

- `High`: clear source-target match and clear code/selector hint.
- `Medium`: clear visual issue, but code location or source intent needs confirmation.
- `Low`: weak match, noisy source/target state, or likely data/rendering variance.

## Difference Categories

Prioritize differences in this order:

1. Missing or extra UI elements.
2. Broken layout: overlap, clipping, overflow, wrong order, wrong alignment.
3. Spacing and density: section gaps, card padding, row height, toolbar spacing.
4. Typography hierarchy: font size, weight, line height, heading/body scale.
5. Color and tokens: text, background, border, disabled/selected/active state.
6. Component state: hover, selected, disabled, loading, empty, error, modal open.
7. Responsive behavior: wrap, scroll, truncation, safe area, mobile density.

Avoid reporting:

- anti-aliasing differences
- exact pixel drift under 4px unless it compounds into visible hierarchy/layout issues
- text/data differences that come from different fixtures
- visual differences already explained by user constraints

## Analysis And Fix Decision

For each candidate difference, decide whether it is fixable now:

- Fix automatically only when confidence is High and the likely code surface is inside the requested UI scope.
- Inspect code before fixing Medium findings. If code confirms the cause, fix narrowly.
- Do not fix Low findings. Report them as notes or ask for confirmation.
- If a finding would require broad design-system, token, API fixture, or unrelated layout changes, stop and report scope expansion.

Every actionable finding must include:

- problem
- source evidence
- target evidence
- confidence
- likely code surface or selector
- suggested edit

## Output Artifacts

Prefer a task-local artifact directory outside `.codex/`, for example:

```text
artifacts/visual-grounding/<slug>/
├── source-desktop.png
├── target-desktop.png
├── diff-desktop.png            # optional
├── crops/                      # optional focused evidence
├── visual-grounding.json
└── report.md
```

Read `references/report-contract.md` before writing `visual-grounding.json` or `report.md`.

## Output Format

Use Korean for user-facing prose unless the user asks otherwise. Keep file paths, selectors, URLs, Figma node ids, class names, and commands exact.

```markdown
**Visual Grounding**

- Source: <Figma node / source URL / image path>
- Target: <local URL / route>
- Viewport: <width>x<height>
- State: <state setup>
- Evidence: <screenshots / Figma metadata / DOM styles / missing evidence>

**Findings**
1. <High|Medium> - <short issue>
   - Source: <region and measurement/visual cue>
   - Target: <region and measurement/visual cue>
   - Code Hint: <file/component/selector candidate>
   - Suggested Edit: <narrow fix>

**Notes**
- <Low-confidence observation or intentional mismatch>

**Next Action**
- <fix applied / recommended next edit / blocked input needed>
```

## Quality Bar

A good visual-grounding result lets Codex say: "I know what is visually wrong, why I believe it is wrong, and which code surface to inspect or change first."
