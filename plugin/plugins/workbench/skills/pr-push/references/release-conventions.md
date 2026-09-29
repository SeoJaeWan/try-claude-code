# Release conventions and decisions

## Inspect the repository

Read applicable project policy (including relevant `.codocs` when present), manifests/workspace graph, lockfile/tool configuration, scripts, CI workflows, prior release PRs/tags/changelogs, and pending release records. Use available read-only evidence; do NOT invent a release convention from a dependency name or copy another project's setup. Resolve conflicting policy/configuration with one material question. Do not create a missing knowledge store.

Review the aggregate proposed PR change from the confirmed comparison base to the prospective source head, including metadata already on local/remote source history and authorized pending edits. Use the PR's actual base/merge-base or an accepted branch comparison; do not infer package impact from only the last commit or unpushed diff. Without an existing PR, a confirmed source/comparison branch is sufficient; ask only if the comparison needed for a release decision is unresolved.

Identify actual publishable packages, applications, or other release targets. Map behavior/API changes to their owners and account for dependencies only according to the project's propagation/fixed/linked-package rules. Distinguish internal/test/docs-only changes and non-release packages. Explain uncertain impact rather than fabricating package lists. Existing release decisions/records apply only while their target/scope is still valid.

## Use the real mechanism

| Detected convention | Metadata preparation |
| --- | --- |
| Changesets | Read `.changeset` configuration and pending entries. Add or update the relevant unconsumed Changeset for confirmed targets, bump levels, and summary. Respect ignore/private/fixed/linked policies. Do NOT run `changeset version`, bump real manifests/lockfiles, or publish. |
| semantic-release, release-please, or other commit/PR-driven release | Read configured analyzers, commit rules, release config, manifests, and required PR labels/title/body. Often there is no extra version file or bump decision; use authorized new commit/PR metadata only when the policy needs it. Do NOT rewrite existing commits or invent a Changeset. |
| Custom release scripts | Inspect script implementation and CI callers to separate metadata preparation from versioning/publishing. Run only a documented safe preparation/check operation in scope; do not execute an opaque release command to discover its effects. |
| Manual version policy | Follow its specified files and version rules. A real manifest/changelog bump is appropriate only if this repository requires it now and the target/version decision is accepted. Do not apply Changesets rules to a manual policy. |
| No release convention | Record that no release metadata is required and proceed with an ordinary authorized push. Do not add tooling or require a new release policy. |

Several mechanisms can coexist for different targets; map each actual target to its policy. Installed dependencies alone do not prove a mechanism is active. Configuration/history conflicts or incomplete required setup need a material decision; absent release automation alone does not block push.

## Ask only for unresolved decisions

Derive recommendations from the aggregate change and policy: breaking public contracts may justify major, backward-compatible features minor, fixes patch, only where the mechanism uses those choices. Package versions and pre-1.0 rules, internal consumers, and target release cadence can change that recommendation. For inferred commit/PR mechanisms, ask only for a missing classification or public-contract decision the configuration cannot resolve.

Batch applicable questions into one concise request: actual affected targets, recommended choices and reasons, any policy conflict, and a no-release option. Explain when project policy disallows no release; do not silently choose it to evade required metadata. Do not ask resolved questions again or force all targets to one bump. A clear accepted decision applies directly; silence is not acceptance. Continue safe read-only inspection while required answers are pending.

## Changesets idempotence

Inspect the current pending entries and source/base release history to distinguish unconsumed records from entries already consumed by a release. Reuse/update the entry that covers this change; do not edit an unrelated team's entry or duplicate a package/bump summary just because the push was invoked again. If the existing record already matches accepted scope, make no metadata change. If new behavior expands that scope, update only the appropriate entry and resolve a changed material decision.

When a no-release decision is valid, add no Changeset. Remove only this request's owned pending entry if it is now unnecessary and authorized; preserve unrelated entries. For multiple packages, list the real confirmed package names and each policy-appropriate bump, applying configured linked/fixed rules. Validate the entry with available non-mutating project checks. Do not regenerate actual package versions, consume pending entries, or copy a previously released record into a new one.
