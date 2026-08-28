# Canonical Wiki Change Queue Contract

## Workbench requirements

- Curate every canonical Wiki change explicitly requested by the user or directly bounded by the supplied knowledge body. Do not impose a one-Wiki-per-invocation limit.
- Inspect the existing project Wiki structure before writing. Use compact catalog evidence to shortlist candidates and retrieve only the bodies needed for each decision.
- Partition separable knowledge units into an ordered queue instead of blocking the request. Determine canonical ownership using `wiki-ontology.md`, then coalesce units with the same owner so one Wiki is not rewritten unnecessarily.
- Order units by supported dependency. Existing or newly created hubs and concept owners precede dependent navigation; when splitting content, the destination owner is verified before the source is narrowed. Otherwise preserve the user's input order.
- Prefer updating an existing Wiki when it already owns the same knowledge boundary. Create a new Wiki only when the concept is distinct and focused.
- Preserve factual meaning. Permit structural edits that improve explicit naming, focused scope, retrieval clarity, canonical ownership, and supported connections; do not invent facts or silently resolve contradictions.
- Block only the affected unit for an unresolved conflict, missing identity, unsafe content, or insufficient current state. Continue later independent units unless the uncertainty also makes them unsafe.

## Sequential write requirements

- Process one queue unit at a time through the MCP's current write contract, then verify and record its outcome before starting the next unit.
- Refresh catalog entries, revisions, references, or relationship state when an earlier result can affect a later decision.
- A split is a sequence of independently verified writes: establish or update the destination owner, verify it, then replace duplicated source detail with a summary and navigation only when that source is also in scope.
- A rename is incomplete while bounded navigation still uses the old identity. After verifying the rename, repair affected in-scope navigation sequentially and check that no stale target remains.
- Treat all queued units within the bounded request as authorized curation work. Do not label later units as additional work requiring separate approval.
- Do not retry a determinate failure unless the MCP guidance authorizes it. Continue with independent units and report the failure in place.
- Stop the dependent remainder when an indeterminate write or shared identity, concurrency, or safety problem prevents a reliable next decision. Report every unit left unprocessed and why.

## Connection requirements

- Treat similarity, nearby naming, and shared keywords as candidate signals only.
- Persist a connection only when the selected content, retrieved Wiki bodies, earlier verified queue results, or authoritative provenance supports it.
- Preserve exact MCP-supplied references and use the relationship representation supported at invocation time. Do not invent MCP reference syntax, identifiers, relation fields, or tool names.
- Distinguish persistent MCP relationships from body-level navigation. When the MCP has no Wiki-to-Wiki relation, use the project's established relation section or the fallback in `wiki-ontology.md` only as navigation metadata; never claim that it created a persistent edge.
- Verify every body-level navigation title and stable slug against the current catalog. Similarity is not enough.
- Do not force a connection when none is justified. Report the Wiki as intentionally standalone or block the unit when the requested knowledge policy requires an anchor.
- Modify only the selected Wiki in each write. Do not rewrite related Wiki bodies solely to create reciprocal links unless the MCP contract performs that relationship change atomically within the selected write.

## MCP boundary

Use the Local Work Memory MCP and follow the guidance and contract it exposes at invocation time. Treat the MCP as authoritative for discovery, retrieval, identity, supported Wiki kinds, references, revisions, persistence, concurrency, relationship representation, and result interpretation.

Do not bind this workflow to named MCP tools or current request fields. Do not invent MCP-owned values or references. Preserve returned references exactly. If the available contract cannot establish the current Wiki state, a safe write, or the outcome, report that uncertainty without bypassing its guidance.

## Result

Report a summary and an ordered result for every queue unit, including:

- whether the selected Wiki was created, updated, left unchanged, or blocked before writing;
- why an existing Wiki was reused or a new Wiki was justified;
- which connections were preserved, added, omitted, or left unresolved;
- whether the body was structurally changed and whether its factual meaning changed;
- which Wiki became the canonical owner, which broad page remained a hub, and which duplicated claims were removed or intentionally retained as history/evidence;
- any exact reference returned by the MCP;
- enough evidence to distinguish success, a determinate failure, a pre-write block, or an indeterminate outcome;
- every unprocessed unit and the shared blocker that prevented safe continuation.

State only that work outside the bounded Wiki curation request was not started. Return after the complete queue result, not after the first Wiki result.
