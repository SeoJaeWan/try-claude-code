---
name: plan-wiki-apply-feedback
description: Deprecated compatibility wrapper for plan wiki docs feedback application. Use `plan-wiki-update` instead to process `feedback/inbox/*.json`, edit canonical plan wiki source files, move feedback records to outcome folders, and refresh generated indexes.
---

# Plan Wiki Apply Feedback

This skill is retained only for old triggers. The normal maintenance path is now `plan-wiki-update`.

## Route

1. Use `plan-wiki-update`.
2. Process feedback inbox records as update sources.
3. Edit canonical `wiki/core/**`, `wiki/patterns/**`, or `raw/**` files.
4. Do not hand-edit generated indexes or manual tag pages.

## Guardrails

- Do not apply stale selections by guessing from topic similarity.
- Do not delete feedback records; move them to outcome folders.
- Do not silently apply semantic rule changes that require user approval.
