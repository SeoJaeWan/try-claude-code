# codex-planning-stack

Local Codex plugin that packages the repository's planning skill bundle.

Included skills:

- `planning`
- `brainstorm`
- `architect`
- `plan-review`
- `plan-materialize`
- `review-wiki-setup`
- `review-wiki-ingest`
- `review-wiki-lint`
- `init-codex-runtime`

Included runtime templates:

- `templates/.codex/agents/plan-architect.toml`
- `templates/.codex/agents/plan-reviewer.toml`
- `templates/.codex/agents/plan-materializer.toml`
- `templates/.codex/config.toml`

The runtime templates are the source-of-truth copies for project-level `.codex`
agent and config files. They are packaged here, but not automatically installed
into a project by this plugin scaffold yet.

To install the bundled `.codex` runtime into a project, use the `init-codex-runtime`
skill or run `scripts/install-runtime.mjs` from this plugin root.
