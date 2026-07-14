# Plan Wiki Pattern Model

Plan wiki pattern documents are OKF-compatible knowledge units.

## Preferred Frontmatter

```yaml
---
type: PlanWiki.Pattern
title: "규칙 제목"
summary: "한 문장 요약"
stage: [plan-maker, review]
tags: [validation]
source: review-finding
raw_sources:
  - ../../raw/example.md
---
```

## Rules

- `type` identifies the knowledge unit. It replaces registry-backed document catalogs as the primary document self-description.
- `tags`, `stage`, and `risk` are observed attributes, not values that must be pre-registered in taxonomy.
- `raw_sources` or `derived_from` should link promoted patterns back to evidence when evidence exists.
- Markdown links express relationships. Do not maintain separate manual tag pages for the same links.
- Use generated indexes for lookup and drift detection.

## Promotion Criteria

Promote feedback to a pattern when it can change future planning before implementation starts. Keep one-off debugging detail out of patterns unless it reveals a reusable planning failure.
