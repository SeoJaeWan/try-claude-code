# Git Commit Conventions

> This document covers only "judgment-required rules" that ESLint/Prettier cannot enforce automatically.
> Mechanical rules are applied by `init-coding-rules` through conversational diff + approval based on this coding-rules folder.

---

## Commit Message Guidelines

### Subject Line (first line)

- **No non-English characters**: Write the subject in English (commitlint does not validate language)
- **50 characters or fewer**: Keep it concise
- **Use the imperative mood**: "add", "fix", "update" (avoid past tense like "added")
- **One commit = one purpose**: Do not bundle multiple changes into a single commit

### Body (optional)

- A **blank line** between the subject and body is required
- Describe changes **specifically** (use bullet points `-`)
- The body may be written in any language

```
feat: add goal archive functionality

- Create archive page component
- Add archive API hook (useGetArchivedGoals)
- Update navigation with archive link
```

### Footer (optional)

- **Breaking Changes**: Use the `BREAKING CHANGE:` prefix to document compatibility-breaking changes
- **Issue references**: `Closes #123`, `Refs #456`

```
BREAKING CHANGE: Legacy token authentication is no longer supported

Closes #123
```

---

## Branch Naming

### Format

```
Single-track:  {type}/{feature-summary}
Parallel-track: {type}/{feature-summary}-{track}
```

### Examples by type

```
feat/{feature-summary}      # feat/add-archive-page
refactor/{work-summary}     # refactor/carousel-card
fix/{bug-summary}           # fix/delete-goal-error
style/{work-summary}        # style/button-design
chore/{work-summary}        # chore/update-deps
docs/{work-summary}         # docs/update-readme
test/{work-summary}         # test/add-auth-tests
```

### Rules

- A type prefix is required (`feat/`, `fix/`, etc.)
- Use kebab-case (underscores and camelCase are forbidden)
- Keep exactly one slash (`/`) in the branch name
- For parallel worktree tracks, append `-{track}` to the summary (example: `feat/login-frontend`)

```
O  feat/add-archive-page
X  add-archive-page          (missing type prefix)
X  feat/add_archive_page     (underscore)
X  feat/AddArchivePage       (camelCase)
```





