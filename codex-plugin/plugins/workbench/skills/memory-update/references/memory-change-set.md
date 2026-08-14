# Work Artifact Persistence Contract

## Workbench requirements

- Persist exactly one complete artifact explicitly selected by the user.
- Treat the producer as provenance only; it does not determine eligibility.
- Reject incomplete summaries, metadata-only inputs, identity mismatches, or unauthorized sensitive content.
- Preserve the artifact body without reinterpretation, redesign, merging, summarization, or meaning-changing redaction.
- If safe persistence would require changing the artifact's meaning, stop without writing.

## MCP boundary

Use the Local Work Memory MCP for persistence and follow the guidance and contract it exposes at invocation time. Treat the MCP as authoritative for required identity, supported artifacts, transfer, idempotency, persistence mechanics, references, and result interpretation.

Do not invent values or references owned by the MCP. Preserve any returned reference exactly. If the available response cannot establish the outcome, report that uncertainty without retrying beyond the MCP's current guidance.

## Result

Report the MCP outcome faithfully, including any returned reference and enough evidence to distinguish success, an existing result, a determinate failure, a pre-write block, or an indeterminate outcome.

Always state:

- whether the artifact body was changed;
- whether approval was granted (`false`);
- whether additional work was started (`false`).

Return immediately after the persistence result.
