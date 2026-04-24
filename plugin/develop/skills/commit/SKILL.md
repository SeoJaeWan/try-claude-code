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
2. Follow the shared convention at `plugin/develop/references/commit-convention.md` with these skill-specific tightenings:
   - **Subject only.** Omit body and footer — this skill is for quick user-triggered commits where the diff speaks for itself.
   - **Strict subject ≤50 characters** (tighter than the shared ≤72 ceiling).
3. If `commitlint.config.mjs` exists and `pnpm exec commitlint --version` succeeds, run `pnpm exec commitlint --last --verbose` after commit and amend until it passes.
4. After commit succeeds, ask via `AskUserQuestion` whether to push.

</Instructions>
</Skill_Guide>
