# Visual Grounding Report Contract

Use this reference when writing visual-grounding artifacts. Keep reports short and actionable.

## Artifact Layout

Use a task-local artifact directory outside `.codex/`:

```text
artifacts/visual-grounding/<slug>/
├── source-<viewport>.png
├── target-<viewport>.png
├── diff-<viewport>.png
├── crops/
│   ├── finding-1-source.png
│   └── finding-1-target.png
├── visual-grounding.json
└── report.md
```

The `diff-*.png` and crops are optional. Prefer crops for actionable findings when the full-page screenshot is too large.

## JSON Shape

```json
{
  "schema_version": 1,
  "source": {
    "type": "figma | url | image",
    "url": "https://...",
    "file_key": "figma file key or null",
    "node_id": "figma node id or null",
    "image": "artifacts/visual-grounding/task/source-desktop.png"
  },
  "target": {
    "type": "local-url",
    "url": "http://localhost:3000/path",
    "image": "artifacts/visual-grounding/task/target-desktop.png"
  },
  "viewport": {
    "name": "desktop",
    "width": 1440,
    "height": 900
  },
  "state": "default",
  "evidence": {
    "figma_metadata": true,
    "source_dom": false,
    "target_dom": true,
    "diff_image": true
  },
  "findings": [
    {
      "id": "vg_001",
      "severity": "High",
      "confidence": "High",
      "category": "spacing",
      "problem": "Filter bar and table are too close together.",
      "source_evidence": {
        "region": "Figma FilterBar -> ResultsTable",
        "measurement": "gap approx 48px",
        "crop": "crops/finding-1-source.png"
      },
      "target_evidence": {
        "region": ".filter-bar -> .results-table",
        "measurement": "gap approx 24px",
        "crop": "crops/finding-1-target.png"
      },
      "code_hints": [
        {
          "file": "src/pages/UsersPage.tsx",
          "selector": ".results-table",
          "reason": "Target DOM class and nearby route component."
        }
      ],
      "suggested_edit": "Increase the vertical margin between FilterBar and ResultsTable using the project spacing token.",
      "fixable_now": true
    }
  ],
  "notes": [
    {
      "confidence": "Low",
      "body": "Avatar images differ because fixtures are not aligned."
    }
  ],
  "blocked": []
}
```

## Markdown Report

Write `report.md` for humans and for the follow-up implementation agent:

```markdown
# Visual Grounding Report

- Source: <source>
- Target: <target>
- Viewport: <viewport>
- State: <state>
- Artifacts: <source image>, <target image>, <diff image if any>

## Summary
<1-2 sentences. Say whether the target is broadly aligned or materially different.>

## Findings
1. High - <problem>
   - Source: <measurement/cue>
   - Target: <measurement/cue>
   - Code Hint: <file/component/selector>
   - Suggested Edit: <narrow edit>

## Notes
- <Low-confidence or intentional differences>

## Blocked
- <missing mapping, inaccessible source, auth/data mismatch, if any>
```

## Severity

- `High`: visible layout break, missing important element, overlap, clipping, wrong state, or difference that blocks design intent.
- `Medium`: visible spacing, typography, color, density, or hierarchy difference with a plausible local fix.
- `Low`: polish-level issue or weak evidence.
- `Info`: intentional mismatch, fixture mismatch, or observation for later.

## Fixability

Set `fixable_now: true` only when:

- source and target regions are matched,
- the issue is not caused by fixture/data mismatch,
- a likely code file/component/selector exists,
- the edit fits the user's requested scope.

Otherwise set `fixable_now: false` and explain the blocker in the finding or `blocked[]`.
