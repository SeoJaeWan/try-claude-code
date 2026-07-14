---
name: dev-wiki-sync
description: Deprecated compatibility wrapper for broad dev wiki synchronization. Use `dev-wiki-audit` instead when Codex needs to compare repository evidence with `.codex/dev-wiki/source/{project}` and propose updates; use `dev-wiki-update` for approved or explicit wiki edits, and `dev-wiki-lint` for index/health maintenance.
---

# Dev Wiki Sync

This skill is retained only for legacy triggers. Do not perform the old schema-wide automatic sync workflow.

## Route

1. Use `dev-wiki-audit` for repo-vs-wiki comparison.
2. Use `dev-wiki-update` for explicit or approved changes.
3. Use `dev-wiki-lint` for generated index refresh and wiki health checks.
4. Use `dev-wiki-graph` for `{project}/graph/**`.

## Guardrails

- Do not rewrite every standard document just because `dev-wiki-sync` was invoked.
- Do not edit graph artifacts outside `dev-wiki-graph`.
- Do not treat observed repository patterns as mandatory conventions without user confirmation.
