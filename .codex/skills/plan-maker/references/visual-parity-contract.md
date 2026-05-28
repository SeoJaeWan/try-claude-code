# Visual Parity Contract

Canonical planning and review rules for reference-based visual comparison.

Use this file when a plan or review depends on screenshot, image, live-page, or Figma comparison evidence.

---

## Comparison Modes

| Mode | Use when | Blocking meaning |
| --- | --- | --- |
| `structural parity` | The implementation must match layout, geometry, state boundaries, and key visual structure, but fixture payloads or decorative detail can intentionally differ | The plan passes when the declared gating surfaces and metrics pass, even if the full canvas still shows advisory drift |
| `full-fidelity parity` | The implementation is expected to match the reference across the whole compared surface, including payload and fine detail | The plan passes only when the declared full-surface metric passes for the target state |

Notes:

- Pick exactly one comparison mode per compared state or scope.
- Do not imply `full-fidelity parity` just because a global mismatch percentage is reported.
- Do not claim `structural parity` closure unless the gating metric is explicitly narrower than whole-canvas drift.

---

## Generic Surface Roles

Use these reusable surface-role names in plan artifacts. Task-local nouns can appear only as local mapping notes.

| Canonical surface role | Meaning |
| --- | --- |
| `frame-surface` | Outer shell, window frame, card frame, container edge, or other top-level structural boundary |
| `navigation-surface` | Wayfinding or collection-selection regions such as menus, panes, tabs, or lists |
| `control-surface` | Interactive controls such as toolbars, actions, toggles, inputs, and dropdowns |
| `content-surface` | The main information body or layout region that carries the primary scenario content |
| `media-surface` | Image, thumbnail, preview, artwork, or other media-bearing region |
| `text-detail-surface` | Text-heavy detail where typography, line metrics, or copy density may need separate treatment |
| `ornament-surface` | Fine visual decoration such as shadows, separators, rounded corners, small badges, or subtle glyph detail |
| `fixture-payload-surface` | Surface whose compared payload is known to vary because the fixture is intentionally synthetic, partial, repeated, masked, or otherwise not reference-equivalent |

---

## Comparison Policy

| Policy | Meaning |
| --- | --- |
| `gating` | Blocking parity decision depends on this surface |
| `advisory` | Must be reported, but does not block closure on its own |
| `noise` | Expected drift bucket; report only as supporting evidence |
| `ignore` | Explicitly excluded from the compare contract |

---

## Metric Treatment

| Metric treatment | Meaning |
| --- | --- |
| `full-compare` | Compare all pixels in the declared surface |
| `boundary-and-geometry` | Judge boundary edges, box geometry, and gross placement, not internal payload fidelity |
| `layout-only` | Judge spatial arrangement and sizing only |
| `text-metrics-only` | Judge text presence, placement, and line/block metrics rather than full glyph raster parity |
| `masked-out` | Remove this surface from blocking pixel arithmetic and explain why |

---

## Minimum Plan Contract

When visual parity is part of acceptance, the plan must state all of the following:

1. The `comparison mode` for each compared state or scope.
2. The blocking `gating metric`.
3. The separate `non-gating metric`, or `none` if no separate advisory metric is needed.
4. A local-surface mapping from task-local UI nouns to reusable canonical surface roles.
5. For each relevant surface, the `comparison policy`.
6. For each relevant surface, the `metric treatment`.
7. A reporting rule that separates blocking pass or fail from global drift reporting.

---

## Review Red Flags

Treat the following as planning or review problems:

- Whole-canvas mismatch percentage is presented as the only success metric while the plan also claims scoped or structural closure.
- Task-local nouns are used as if they were reusable taxonomy.
- The plan says a large mismatch is expected, but does not say whether that drift is `advisory`, `noise`, or `ignore`.
- A fixture-payload difference is acknowledged, but the metric treatment still counts it as blocking whole-surface drift.
- The plan claims parity closure without saying which surfaces are actually blocking.
