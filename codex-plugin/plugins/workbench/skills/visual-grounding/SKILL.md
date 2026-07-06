---
name: visual-grounding
description: Visual and interaction grounding workflow for UI implementation work. Use when the user wants Codex to compare a Figma frame, source website, reference screenshot, or reported UI interaction against a local implementation route so the AI can identify actionable visual differences, interaction failures, and likely UI issues. Triggers include "visual grounding", "visual compare", "interaction grounding", "Figma와 비교", "원본 UI와 비교", "현재 구현 화면 비교", "디자인 보고 수정", "드래그/클릭/포커스 확인", or when a frontend task has a clear source UI, target route, or interaction symptom.
---

# Visual Grounding

Use this skill to help Codex see what to fix in UI work by building a grounded evidence package: source UI evidence, target implementation evidence, matched regions, interaction observations, difference candidates, confidence, and code/selector hints.

This is not a pixel-perfect approval gate. The goal is to produce a small set of findings that are specific enough for an implementation agent to act on.

## Core Rules

- Do NOT rely on screenshots alone when structured evidence is available.
- Do NOT claim a visual issue is actionable unless it has a source region, target region, and likely code/selector hint.
- Do NOT auto-fix low-confidence differences, anti-aliasing noise, data mismatch, or intentional product copy/content differences.
- Do NOT compare unrelated states. Align route, viewport, theme, auth, data state, modal/open/selected state, and scroll position first.
- Do NOT treat an interaction automation failure as a product bug until the target coordinate, visible element stack, viewport, and event path have been checked when practical.
- Do NOT turn every pixel mismatch into a finding. Report the few differences that affect layout, hierarchy, usability, or design fidelity.
- Prefer High/Medium confidence findings. Put uncertain observations in `Notes` or `Open Questions`.
- If the source and target cannot be aligned enough for useful comparison, stop with a blocked report and name the missing input.

## Inputs

Identify:

- Source UI: Figma URL/node, production/source URL, or image file.
- Target UI: local URL/route, app command if needed, viewport, and state setup.
- Scope: entire page, one frame/section, modal, component, responsive breakpoint, specific visual concern, or interaction symptom.
- Interaction, when relevant: click, drag, scroll, focus, hover, keyboard, touch, gesture timing, target coordinate/selector, expected state change, and whether the failure is deterministic or flaky.
- Cheap clarifications, when relevant: dev/prod, browser/device, viewport, zoom/device scale, reduced motion, console errors, first-action-only behavior, and whether the user can provide these faster than Codex can instrument them.
- Constraints: whether Codex may modify code after the report, whether to inspect only, and which differences are intentionally accepted.

If source and target mapping is unclear, ask for the missing mapping before doing visual work. The minimum useful mapping is:

```json
{
  "source": "Figma URL, source URL, or image path",
  "target": "local URL or route",
  "viewport": { "width": 1440, "height": 900 },
  "state": "default / selected tab / modal open / logged-in fixture",
  "interaction": "optional: drag window titlebar / click Save / keyboard Tab sequence"
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

### Interaction Evidence

When the task includes a UI interaction symptom such as drag, click, focus, scroll, hover, keyboard, touch, or flaky first action:

1. Align the target state before interacting: route, viewport, scroll position, open modal/menu, auth, fixture data, and selected item.
2. If the reporter is available, ask cheap environment questions before building expensive automation when those answers would distinguish the same hypotheses.
3. Identify the intended target by selector, role/text, or coordinate. Prefer semantic selectors where available, but record coordinates when the bug is coordinate-sensitive.
4. Before trusting a failed interaction, validate the measurement:
   - capture the target bounding box
   - call `elementsFromPoint` or equivalent for the action coordinate
   - record viewport size, scroll offsets, and overlay/modal/menu stack
   - verify the element is visible, enabled, and not covered when relevant
5. Capture event or state traces that distinguish likely causes:
   - pointer/mouse/touch/keyboard event order
   - `pointercancel`, `blur`, `focusin`, `scroll`, or mutation events
   - DOM attribute/state changes before and after the interaction
   - bounding box or pixel deltas for drag/resize/move behavior
6. For flaky symptoms, repeat the interaction enough times to report a frequency, such as `4/6 failed`, and repeat the same measurement after a fix. Note when the sample is directional rather than conclusive.
7. Compare runtime modes when they may affect UI behavior: dev/prod, StrictMode, HMR/fresh server, browser, viewport, device scale factor, reduced motion, or mobile/touch emulation.
8. If external observation cannot distinguish causes, recommend a narrow temporary source probe for `executor` rather than guessing from screenshots.

Interaction findings should separate:

- product behavior facts
- measurement-tool risks
- unconfirmed hypotheses
- code/selector hints

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
8. Interaction behavior: wrong target receives event, first action ignored, drag delta mismatch, focus/scroll side effect, event cancellation, flaky state transition, dev/prod behavior split.

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
- interaction evidence when relevant
- measurement-tool check when relevant
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
- Interaction: <not applicable / action, target, timing, expected result>
- Evidence: <screenshots / Figma metadata / DOM styles / missing evidence>

**Findings**
1. <High|Medium> - <short issue>
   - Source: <region and measurement/visual cue>
   - Target: <region and measurement/visual cue>
   - Interaction: <event trace / element stack / bounding box delta / repeated-run result, when relevant>
   - Measurement Check: <coordinate/overlay/test-tool validation, or "not needed">
   - Sample Note: <repeat count and whether evidence is directional or stable, when relevant>
   - Code Hint: <file/component/selector candidate>
   - Suggested Edit: <narrow fix>

**Notes**
- <Low-confidence observation or intentional mismatch>

**Next Action**
- <fix applied / recommended next edit / blocked input needed>
```

## Quality Bar

A good visual-grounding result lets Codex say: "I know what is visually wrong, why I believe it is wrong, and which code surface to inspect or change first."
