# Dev Wiki Update Contract

## Purpose

Update the project wiki so it reflects explicit user-provided development rules. The wiki is a maintained reference, not a chronological log.

## Input

The user may provide:

- A new convention
- A folder placement rule
- A naming rule
- A testing or verification rule
- An architecture boundary
- A workflow command
- A project-specific prohibition or exception

## Required Handling

For each rule:

1. Identify the rule owner document.
2. Check whether the topic already exists.
3. Update existing prose when present.
4. Create a focused section or document when absent.
5. Remove or reconcile contradiction when the new rule supersedes old guidance.
6. Leave Git diff as the history.

For repository-wide inference or stale wiki cleanup, stop and route to `dev-wiki-sync`.

## Writing Shape

Prefer this shape inside the target document:

```markdown
## <주제>

### 규칙

...

### 이유

...

### 예외

...
```

Use shorter sections when the rule is simple. Do not force all three subsections when they add noise.

## Verification

After editing, run:

```bash
git -C .codex/dev-wiki/source status --short
```

Report only dev wiki repo changes relevant to the explicit update.
