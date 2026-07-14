---
name: plan-wiki-lint
description: Scan and maintain the shared plan wiki by refreshing generated frontmatter/link indexes, checking core/pattern/raw health, reporting tag or term drift, and applying only safe mechanical cleanup. Use when Codex needs to lint, inspect, refresh generated indexes, or prepare cleanup proposals for `.codex/plan-wiki/source/wiki` without applying semantic rule changes.
---

# Plan Wiki Lint

Maintain the plan wiki as an OKF-compatible shared planning knowledge bundle. Lint now observes document attributes and generated indexes instead of enforcing manual taxonomy, adjacency, or tag-page registries.

## Required Reading

Read [references/checklist.md](references/checklist.md) before scanning or editing.

## Workflow

1. Verify the target.
   - Plan wiki root: `./.codex/plan-wiki/source/wiki`.
   - Required control file: `wiki/registry.json`.
   - If the source repo is missing or broken, stop and use `plan-wiki-setup`.

2. Refresh generated indexes.
   - Run `node .codex/tools/wiki-index.mjs --mode plan --root .codex/plan-wiki/source/wiki`.
   - Treat `wiki/generated/**` as derived output. Do not hand-edit it.

3. Inspect the health output.
   - Read `wiki/generated/wiki-health.md`.
   - Read `wiki/generated/normalize-proposals.md`.
   - Inspect core, pattern, and raw source files only as needed to verify reported issues.

4. Run plan-wiki-specific checks.
   - Ensure registry stage-core files exist.
   - Ensure core and pattern documents have useful `type` metadata or a migration finding.
   - Ensure promoted patterns link to evidence when evidence exists.
   - Ensure feedback outcome records are not malformed when feedback folders exist.
   - Ensure project-specific facts are not promoted into shared policy without generalization.

5. Apply only safe mechanical cleanup.
   - Safe: generated refresh, duplicate frontmatter list entries, obvious metadata whitespace, and stale generated files.
   - Approval required: tag merge, pattern merge, rule weakening/strengthening, core promotion, raw deletion, feedback deletion, or registry routing changes.

6. Report.
   - Summarize generated files changed, blocking health issues, cleanup applied, and cleanup proposals that need approval.
   - Run `git -C .codex/plan-wiki/source status --short`.
   - Do not commit or push unless the user explicitly asks.

## Guardrails

- Do not reintroduce manual `wiki/tags/**` maintenance as the source of truth.
- Do not block on unregistered tags; tags are observed from frontmatter.
- Do not use generated files as canonical policy.
- Do not apply semantic cleanup without explicit approval.
- Do not edit dev wiki files.
