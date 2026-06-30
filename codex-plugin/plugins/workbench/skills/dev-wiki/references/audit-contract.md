# Dev Wiki Audit Contract

## Purpose

Find where project wiki prose is stale, missing, too strong, or contradicted by repository evidence. Audit is not a blanket rewrite.

## Evidence Levels

- **Enforced policy**: Proven by tests, lint, schema, CI, config, or explicit repo docs.
- **Observed convention**: Repeated in source but not enforced.
- **Assumption**: Plausible but not proven.
- **Missing evidence**: The wiki claims something the repository does not show.

## Audit Targets

- `project.json`: project name, schema version, source roots, stack summary.
- `conventions/`: coding, folder placement, naming, testing, API, UI, rule application.
- `architecture/`: overview, layers, module boundaries, state, external boundaries.
- `workflows/`: commands, local development, quality checks, git, release.
- `graph/`: generated evidence freshness and blind spots.

## Output

Report findings as:

- finding
- affected wiki file
- repository evidence
- recommended action
- whether user approval is required

Apply only approved semantic corrections.
