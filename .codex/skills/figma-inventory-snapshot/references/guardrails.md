# Figma Inventory Snapshot Guardrails

- Do not classify components or write planning decisions.
- Do not modify Figma.
- Do not use Code Connect tools as a full tree inventory substitute.
- Do not treat Code Connect permission errors as proof that Figma tree metadata is unavailable.
- Do not perform full-file tree reads when the task names root nodes or pages.
- Do not fill required paths from previous parity reports, package registries, or memory.
- Do not merge stale and fresh snapshots without recording root-level provenance.
- Do not hide missing roots inside `summary.md`; record them in `manifest.json`.
- Do not ask the user for tool failures, access failures, timeout failures, or missing shard data unless a user decision is actually needed.
