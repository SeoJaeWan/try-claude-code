---
name: dev-wiki-audit
description: Compare a project dev wiki against current repository evidence, report stale or missing conventions, architecture notes, workflow commands, graph freshness, and project metadata, then apply only user-approved corrections. Use instead of dev-wiki-sync when Codex needs a repo-vs-wiki audit, refresh recommendation, or broad consistency check for `.codex/dev-wiki/source/{project}`.
---

# Dev Wiki Audit

Audit whether the project dev wiki still matches the repository. This skill replaces the old strong "sync everything" posture with evidence-backed findings and approved corrections.

## Required Reading

Read [references/audit-contract.md](references/audit-contract.md) before gathering repository evidence.

## Workflow

1. Verify opt-in.
   - Read `./.codex/dev-wiki/config.json`.
   - If missing, stop and route to `dev-wiki-setup`.
   - Resolve the project root as `./.codex/dev-wiki/source/{project}`.

2. Refresh wiki indexes first.
   - Run `node .codex/tools/wiki-index.mjs --mode dev --root .codex/dev-wiki/source/{project}`.
   - Read `{project}/generated/wiki-health.md` and carry health issues into the audit report.

3. Inspect repository evidence.
   - Read only evidence needed for the requested audit scope.
   - Common evidence includes package manifests, scripts, configs, CI, source roots, test layout, env references, routes, API clients, and recent Git changes.
   - Use `dev-wiki-graph` when graph artifacts are missing or stale.

4. Compare wiki prose to evidence.
   - Check `project.json`, `conventions/`, `architecture/`, `workflows/`, and generated graph freshness.
   - Distinguish observed convention, enforced policy, assumption, and missing evidence.
   - Do not convert an observed pattern into a mandatory rule without user confirmation.

5. Report and update.
   - Write findings in chat unless the user asked for a wiki report file.
   - Apply narrow, user-approved corrections through the same editing discipline as `dev-wiki-update`.
   - After any write, rerun `node .codex/tools/wiki-index.mjs --mode dev --root .codex/dev-wiki/source/{project}`.
   - Run `git -C .codex/dev-wiki/source status --short`.

## Guardrails

- Do not overwrite whole wiki documents to match a generated summary.
- Do not edit plan wiki files.
- Do not edit `{project}/graph/**`; route graph refreshes to `dev-wiki-graph`.
- Do not write history files. Git is the change history.
- Do not push or commit the dev wiki source repo unless the user explicitly asks.
