---
name: pr-push
description: Prepare repository-appropriate release metadata and push the confirmed PR source branch on explicit request. Use for "PR 브랜치 푸시해", "릴리스 정보 확인하고 푸시해", or "PR push 해줘". Does not publish a release or deploy.
disable-model-invocation: true
---

# PR Push

Prepare applicable release metadata, verify the exact source commit, push normally, and yield. Work from repository and Git evidence; do not require a previous execution run, live workers, or removed task worktrees. Keep the caller's model unchanged.

Read [release-conventions.md](references/release-conventions.md) to detect release policy and decide whether metadata is needed, then [push-delivery.md](references/push-delivery.md) for isolated writes, commits, exact-head push, and reporting.

## Procedure

1. Resolve repository/common dir, local source branch and exact HEAD, existing PR/base when available, and the source repository/remote/ref (including forks). Read project instructions and relevant local knowledge, actual package/tool configuration, scripts, CI, release records, and the aggregate proposed PR diff. Do not assume a particular product, branch name, release tool, or input producer.
2. Detect the actual release convention. Determine affected release targets from changed behavior/public contracts and the project's package graph and policy; docs/tests/tooling changes may need no release. Inspect existing pending metadata and accepted decisions before proposing anything.
3. Only when a material decision remains, batch the needed target/bump/no-release or policy questions with evidence and a recommendation. Use the convention's own decision vocabulary; do not ask major/minor/patch for mechanisms that infer it. Honor known accepted decisions for the current scope and wait only for necessary answers.
4. Follow repository isolation policy and use a clean, authorized source/preparation checkout to prepare only required in-scope metadata and run applicable safe checks. Do not bump actual manifests for a pending Changeset. Repeated requests reuse or update relevant unconsumed metadata rather than duplicating it. Do not install or standardize release tooling.
5. Commit only authorized changes, retain the verified exact delivery commit in the confirmed local source branch, push that SHA normally to the confirmed remote source ref, and verify both heads. Report metadata/decisions, checks, commit, and actual push outcome, then yield.

An explicit request enables normal push to the confirmed source branch and necessary release-metadata edits/commits when project policy permits. A distinct commit or policy approval still required by the repository must be resolved before that mutation; avoid asking again for accepted authority. Missing release tooling is not a blocker to an ordinary push when policy permits no metadata.

Do NOT create a PR, merge into its base, deploy, publish a package/release, run a version/release command that publishes, force-push or rewrite history, delete branches/worktrees, post comments, or monitor CI. Change an existing PR's labels/title/body only when the actual release policy requires it and that change is authorized. Keep skills self-contained and stop after this request.
