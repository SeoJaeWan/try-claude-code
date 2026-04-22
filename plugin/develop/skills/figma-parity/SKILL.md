---
name: figma-parity
description: "Figma-native design parity audit. Compares a Figma node against an implementation by reading tokens, component mappings, structure, typography, fills, and spacing via Figma MCP and agent-browser DOM introspection — no PNG export, no pixelmatch. Use when the reference is a Figma URL and the question is 'does my implementation match this Figma node'. Triggers on: Figma-based visual audit, design token verification, Figma-to-code parity check, 디자인 패리티, Figma 비교, 토큰 비교, 피그마 검증. Run inside the `figma-parity-auditor` agent."
model: sonnet
---

<Skill_Guide>
<Purpose>
Structured parity audit between a Figma node and its implementation.
Reads design intent (tokens, structure, components, typography, spacing, effects) via Figma MCP,
reads implementation reality via agent-browser DOM introspection,
and reports per-dimension deltas with actionable token names — not pixel percentages.
</Purpose>

<Instructions>
# figma-parity

Dedicated Figma-native comparison workflow. Replaces pixelmatch for Figma-sourced references.

## When to use this vs `visual-compare`

| Reference source | Skill |
|---|---|
| Figma URL (`figma.com/design/...`) | **figma-parity** (this skill) |
| External image file / external URL / production site | `visual-compare` (pixelmatch) |

Do NOT use pixelmatch for Figma references. Figma MCP exposes tokens, variables, component mappings, and node properties as structured data — pixel diff throws all that away and reports a percentage you then have to reverse-engineer.

## Quick Reference

**Parity dimensions — report each one explicitly:**

1. Component mapping (Code Connect)
2. Design tokens (variables)
3. Node / DOM structure
4. Typography
5. Fills / stroke / color
6. Spacing (auto-layout ↔ flex/padding)
7. Effects (shadow / blur)

**Artifact naming — one file per case:**

```
{kind}-{state}-parity.md
{kind}-{state}-parity.json   (optional, when downstream automation consumes it)
```

The `{kind}-{state}` key is shared with any sibling pixelmatch cases so reports remain correlatable.

**Status values:** `match`, `delta`, `missing`, `extra`, `n/a`.

**Pass rule:** a case passes only when every dimension is `match` or `n/a`. Any `delta`/`missing`/`extra` → fail, must be reported with actionable specifics.

## Workflow

### Step 1 — Parse Figma URL

- `figma.com/design/:fileKey/:fileName?node-id=:nodeId` → convert `-` to `:` in nodeId
- `figma.com/design/:fileKey/branch/:branchKey/:fileName` → use branchKey as fileKey
- `figma.com/make/:makeFileKey/...` → use makeFileKey
- `figma.com/board/...` → FigJam, not supported — stop and ask for a design URL

### Step 2 — Pull Figma-side parity data

Call in order, stopping when you have enough:

1. `mcp__plugin_figma_figma__get_design_context` — primary. Returns code reference, screenshot (for your vision context only), and hints (Code Connect mappings, token variables, component docs, annotations). Read the hints carefully — most parity answers are there.
2. `mcp__plugin_figma_figma__get_variable_defs` — extracts variables/tokens used by the node. Use this to populate the **tokens** dimension.
3. `mcp__plugin_figma_figma__get_code_connect_map` — returns Figma→code component mappings. Use this to populate the **component mapping** dimension.
4. `mcp__plugin_figma_figma__get_metadata` — node structural tree. Use this to populate the **structure** dimension.
5. `mcp__plugin_figma_figma__get_context_for_code_connect` — only when a specific mapping needs disambiguation.
6. `mcp__plugin_figma_figma__search_design_system` — only when you need to confirm a library component exists.

### Step 3 — Read deep node properties via `use_figma` (only when needed)

When `get_design_context` / `get_variable_defs` don't surface a specific property (typography style, fill paint values, auto-layout gap, effects), use `mcp__plugin_figma_figma__use_figma` with a read-only inspection script:

```js
const node = await figma.getNodeByIdAsync('<nodeId>');
if (!node) return { error: 'node-not-found' };

const serialize = (n) => ({
  id: n.id,
  name: n.name,
  type: n.type,
  layoutMode: n.layoutMode,
  itemSpacing: n.itemSpacing,
  paddingLeft: n.paddingLeft,
  paddingRight: n.paddingRight,
  paddingTop: n.paddingTop,
  paddingBottom: n.paddingBottom,
  fills: n.fills,
  strokes: n.strokes,
  effects: n.effects,
  cornerRadius: n.cornerRadius,
  fontName: n.fontName,
  fontSize: n.fontSize,
  lineHeight: n.lineHeight,
  letterSpacing: n.letterSpacing,
  fontWeight: n.fontWeight,
  boundVariables: n.boundVariables,
});
return serialize(node);
```

Always pass `skillNames: "figma-parity"` when calling `use_figma`. Run small, incremental scripts — one dimension per call. Never write to the file via `use_figma` in this skill — audits are read-only toward Figma.

Do NOT use `use_figma` to export PNG via `exportAsync`. This skill never produces PNG. If you think you need a pixel-level check, STOP — that case belongs in `visual-compare` with an externally-provided reference image, not here.

### Step 4 — Capture implementation-side data

Use `npx agent-browser` to open the implementation and introspect the DOM + computed styles:

```bash
npx agent-browser set viewport 1280 800   # or "set device iPhone 12" for mobile cases
npx agent-browser open <implementation-url>
npx agent-browser wait "<target-selector>"
```

Extract structured data with `evaluate` — return JSON via `JSON.stringify`:

```bash
npx agent-browser evaluate "JSON.stringify((() => {
  const el = document.querySelector('<target-selector>');
  if (!el) return { error: 'not-found' };
  const cs = getComputedStyle(el);
  return {
    tag: el.tagName.toLowerCase(),
    classList: [...el.classList],
    children: [...el.children].map(c => ({ tag: c.tagName.toLowerCase(), classList: [...c.classList] })),
    typography: {
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      color: cs.color,
    },
    box: {
      padding: cs.padding,
      margin: cs.margin,
      gap: cs.gap,
      borderRadius: cs.borderRadius,
    },
    visual: {
      background: cs.background,
      boxShadow: cs.boxShadow,
      border: cs.border,
    },
  };
})())"
```

Scope each `evaluate` to the smallest relevant element. Do NOT dump entire document trees — keep payloads small.

For interaction-gated states (context menus, hover, expanded, etc.), seed state before reading (see `references/agent-browser-patterns.md` in the sibling `visual-compare` skill — the commands are identical for this skill's purposes).

### Step 5 — Compare dimension by dimension

For each of the seven parity dimensions, compare Figma-side data (Steps 2-3) against implementation-side data (Step 4). Produce a row per dimension with:

- `figma`: raw value / token name
- `implementation`: raw value / class name / computed CSS
- `status`: `match` | `delta` | `missing` | `extra` | `n/a`
- `note`: when status ≠ match, WHY (e.g., "token `color/border/subtle` unused, fell back to hex")

#### Component mapping (Code Connect)

From `get_code_connect_map`, identify the mapped codebase component for the Figma node. Then check which component the implementation actually uses (grep imports in the relevant source file, or inspect the DOM data-component attribute if the project uses one).

- `match` — implementation uses the mapped component
- `delta` — implementation uses a different component than the Code Connect mapping
- `missing` — no Code Connect mapping exists for this node
- `n/a` — Figma file has no Code Connect setup

#### Tokens

From `get_variable_defs`, list the variables the node binds. For each:

- Resolve Figma variable name → project token (tailwind class, CSS var, theme key)
- Read the implementation's computed value for that property
- `match` — computed value equals the resolved token's value
- `delta` — computed value differs (note the raw values)
- `missing` — implementation uses a hardcoded value instead of the token

#### Structure

From `get_metadata`, get the Figma node tree. From `evaluate`, get the DOM tree at equivalent depth. Compare:

- Child count at each depth level
- Child type/name order
- Nested group structure

Do not require one-to-one node correspondence — Figma groups and DOM elements don't map perfectly. Report structural similarity: "Figma tree depth 4 / DOM depth 4", "child counts [3,2,5,1] / [3,2,5,1]". Flag large divergences.

#### Typography, Fills, Spacing, Effects

For each, compare Figma properties (from `get_design_context` hints or `use_figma` inspection) against computed CSS from `evaluate`. Report per-property deltas with raw values on both sides.

### Step 6 — Write the parity report

Default path: `<phase-artifact-dir>/{kind}-{state}-parity.md`.

Template:

```markdown
# Parity report — {kind}/{state}

- Figma file: `{fileKey}` node `{nodeId}`
- Implementation: `{url or selector}`
- Overall: **{pass|fail}** ({N} dimensions checked, {M} deltas)

## Component mapping
| Figma | Implementation | Status |
|---|---|---|
| ... | ... | match/delta/... |

## Tokens
| Figma variable | Resolved token | Implementation value | Status | Note |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

## Structure
- Figma: depth {n}, child counts [{...}]
- DOM:   depth {n}, child counts [{...}]
- Status: ...

## Typography
| Property | Figma | Implementation | Status |
|---|---|---|---|
| font-family | ... | ... | match |
| font-size | ... | ... | delta (+2px) |
| ... | ... | ... | ... |

## Fills
| Surface | Figma | Implementation | Status |
|---|---|---|---|
| ... | ... | ... | ... |

## Spacing (auto-layout ↔ flex/padding)
| Property | Figma | Implementation | Status |
|---|---|---|---|
| gap | 8 | 12 | delta (+4px) |
| ... | ... | ... | ... |

## Effects
| Effect | Figma | Implementation | Status |
|---|---|---|---|
| ... | ... | ... | ... |

## Hand-off notes
- Actionable deltas (one bullet per delta; include token names and exact values).
```

If downstream automation needs structured input, also emit `{kind}-{state}-parity.json` mirroring the same dimensions.

### Step 7 — Act based on mode

**Mode A — Report only (default)**
Write the report. Do NOT modify any code.

**Mode B — Verification (after a frontend implementation phase)**
Write the report. On fail, describe each delta with the exact change a frontend-developer phase would need to make (e.g., "swap `rounded-lg` → `rounded-md`", "bind `color/border/subtle` variable"). Do NOT edit code in this phase.

**Mode C — Dedicated plan phase**
Write repo-local artifacts under the phase's artifact path. Return a pass/fail plus the delta list for a downstream `frontend-developer` phase.

## What to avoid

- Do NOT use pixelmatch for Figma references. Wrong tool — see "When to use this vs visual-compare" table.
- Do NOT export PNG via `use_figma` `exportAsync` in this skill. Parity audits are structural, not pixel-level.
- Do NOT call `get_screenshot` as a comparison step. The screenshot it returns is vision-only and cannot be persisted — use it only as a sanity-check aid for the auditing agent's own eyes.
- Do NOT dump full DOM trees via `evaluate`. Scope each query to the smallest relevant element; payloads stay in agent context.
- Do NOT use Figma MCP write/create tools (`use_figma` for mutations, `generate_*`, `create_*`, `send_code_connect_mappings`) — this skill is read-only toward Figma.
- Do NOT authenticate via MCP from inside this skill. If Figma MCP auth is missing, stop and ask the user to complete auth in the main session.
- Do NOT report a single pass/fail percentage. Always break down by the seven dimensions — that is the whole point of the skill.
- Do NOT fall back to pixel comparison when a parity dimension is hard to inspect. Stop and ask the user whether to widen the audit or switch to `visual-compare` with an externally-provided reference image for that specific case.
- Do NOT guess token names. Resolve them from `get_variable_defs` / project config files — never fabricate.
- Do NOT modify product source files in this skill. Hand deltas off to a later `frontend-developer` phase.

## agent-browser reference

See `../visual-compare/references/agent-browser-patterns.md`. The DOM-introspection commands (`open`, `evaluate`, `wait`, `get box`, `set viewport`, `set device`) are identical for both skills.

</Instructions>
</Skill_Guide>
