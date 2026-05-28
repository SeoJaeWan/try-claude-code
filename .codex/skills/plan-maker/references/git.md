# Git Commit Conventions

> This document covers only judgment-required rules that ESLint and Prettier cannot enforce automatically.
> Mechanical rules are handled separately by coding-rules setup and review flow.

---

## Commit Message Guidelines

### Subject Line

- Use English only
- Keep the subject within 50 characters
- Use the imperative mood such as `add`, `fix`, `update`
- Keep one commit focused on one purpose

### Body

- Leave one blank line between subject and body
- Describe changes specifically
- Use bullet points with `-`
- The body may be written in any language

Example:

```text
feat: add goal archive functionality

- Create archive page component
- Add archive API hook (useGetArchivedGoals)
- Update navigation with archive link
```

### Footer

- Use `BREAKING CHANGE:` for compatibility-breaking changes
- Use issue references like `Closes #123` or `Refs #456`

Example:

```text
BREAKING CHANGE: Legacy token authentication is no longer supported

Closes #123
```

---

## Branch Naming

### Format

```text
{type}/{task-slug}
```

### Type Examples

```text
feat/{task-slug}
refactor/{task-slug}
fix/{task-slug}
style/{task-slug}
chore/{task-slug}
docs/{task-slug}
test/{task-slug}
```

### Rules

- A type prefix is required
- Use kebab-case only
- Use exactly one slash (`/`) in the branch name
- Reuse the plan header `branch` value as the source of truth, and keep the branch summary mechanically related to `plan_slug`

Examples:

```text
O  feat/windows-ui-taskbar-shell
O  fix/taskbar-overflow-hitbox
X  add-archive-page
X  feat/add_archive_page
X  feat/AddArchivePage
```

---

## Worktree Naming

### Rule

- The executable plan file has one worktree execution unit.
- The runner may sanitize the `branch` value for a filesystem directory name.
- Do not invent a second human summary; keep `plan_slug`, `branch`, and any worktree display name mechanically linked.

Examples:

```text
Plan:     plans/windows-ui-taskbar-shell/frontend.plan.md
Branch:   feat/windows-ui-taskbar-shell
Worktree: windows-ui-taskbar-shell

Plan:     plans/taskbar-overflow-hitbox/plan.md
Branch:   fix/taskbar-01-overflow-hitbox
Worktree: taskbar-01-overflow-hitbox
```
