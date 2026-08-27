# Canonical Wiki Curation Contract

## Workbench requirements

- Curate exactly one canonical Wiki explicitly selected by the user or bounded by the requested change.
- Inspect the existing project Wiki structure before writing. Use compact catalog evidence to shortlist candidates and retrieve only the bodies needed for the decision.
- Prefer updating an existing Wiki when it already owns the same knowledge boundary. Create a new Wiki only when the concept is distinct and focused.
- Stop before writing when the input combines separable knowledge units, conflicts with current canonical knowledge without resolution, lacks required identity, or contains unauthorized sensitive content.
- Preserve factual meaning. Permit structural edits that improve explicit naming, focused scope, retrieval clarity, and supported connections; do not invent facts or silently resolve contradictions.

## Connection requirements

- Treat similarity, nearby naming, and shared keywords as candidate signals only.
- Persist a connection only when the selected content, retrieved Wiki bodies, or authoritative provenance supports it.
- Preserve exact MCP-supplied references and use the relationship representation supported at invocation time. Do not invent reference syntax, identifiers, relation fields, or tool names.
- Do not force a connection when none is justified. Report the Wiki as intentionally standalone or block when the requested knowledge policy requires an anchor.
- Modify only the selected Wiki. Do not rewrite related Wiki bodies solely to create reciprocal links unless the MCP contract performs that relationship change atomically within the selected write.

## MCP boundary

Use the Local Work Memory MCP and follow the guidance and contract it exposes at invocation time. Treat the MCP as authoritative for discovery, retrieval, identity, supported Wiki kinds, references, revisions, persistence, concurrency, relationship representation, and result interpretation.

Do not bind this workflow to named MCP tools or current request fields. Do not invent MCP-owned values or references. Preserve returned references exactly. If the available contract cannot establish the current Wiki state, a safe write, or the outcome, report that uncertainty without bypassing its guidance.

## Result

Report the MCP outcome faithfully, including:

- whether the selected Wiki was created, updated, left unchanged, or blocked before writing;
- why an existing Wiki was reused or a new Wiki was justified;
- which connections were preserved, added, omitted, or left unresolved;
- whether the body was structurally changed and whether its factual meaning changed;
- any exact reference returned by the MCP;
- enough evidence to distinguish success, a determinate failure, a pre-write block, or an indeterminate outcome.

Always state that approval for additional work was not granted and additional work was not started.

Return immediately after the curation result.
