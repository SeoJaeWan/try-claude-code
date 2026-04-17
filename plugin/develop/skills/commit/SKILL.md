---
name: commit
description: "Commits Git changes following Conventional Commits rules. Triggered by 'commit', 'commit this', '/commit', '커밋', '커밋해줘' requests."
model: haiku
allowed-tools: Bash, Read, Glob, AskUserQuestion
---

<Skill_Guide>
<Purpose>
Commit staged changes using Claude Code's base commit workflow with Conventional Commits formatting.
</Purpose>

<Instructions>

# Git Commit

Follow the base Claude Code commit workflow documented in the system prompt (HEREDOC commit messages, pre-commit hook handling, `-i` flag prohibition, no `git config` edits, no force-push, never skip hooks).

## Project-specific additions

1. Ask via `AskUserQuestion` whether to commit on the current branch or create a new branch first.
2. Use Conventional Commits: `{type}: {concise summary}` — subject line only, ≤50 characters. No body, no footer.
3. If `commitlint.config.mjs` exists and `pnpm exec commitlint --version` succeeds, run `pnpm exec commitlint --last --verbose` after commit and amend until it passes.
4. After commit succeeds, ask via `AskUserQuestion` whether to push.

## Commit type hints

| Change | Type |
|---|---|
| New file | `feat` |
| Bug fix | `fix` |
| Refactor | `refactor` |
| Style/CSS | `style` |
| Docs | `docs` |
| Config/build | `chore` |
| Tests | `test` |

</Instructions>
</Skill_Guide>
