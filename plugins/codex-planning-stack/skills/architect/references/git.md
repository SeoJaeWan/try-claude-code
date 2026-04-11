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
- Reuse the owning executable plan folder name as the `task-slug`

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

### Format

```text
{task-slug}
```

### Rules

- Reuse the executable plan folder name as the worktree directory name
- Reuse the branch summary as-is and do not include the branch type prefix
- Do not invent a second summary; keep plan, branch summary, and worktree names mechanically linked

Examples:

```text
Plan:     plans/windows-ui-taskbar-shell/plan.md
Branch:   feat/windows-ui-taskbar-shell
Worktree: windows-ui-taskbar-shell

Plan:     plans/taskbar-01-overflow-hitbox/plan.md
Branch:   fix/taskbar-01-overflow-hitbox
Worktree: taskbar-01-overflow-hitbox
```
