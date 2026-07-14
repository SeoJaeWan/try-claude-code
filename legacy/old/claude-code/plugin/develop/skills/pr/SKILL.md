---
name: pr
description: "Creates a GitHub Pull Request. Triggered by 'PR', 'open a PR', 'pull request', 'PR 올려줘', '풀리퀘' requests."
model: haiku
allowed-tools: Bash, Read, Glob, AskUserQuestion
---

<Skill_Guide>
<Purpose>
Create a GitHub Pull Request using Claude Code's base PR workflow.
</Purpose>

<Instructions>

# Pull Request Creation

Follow the base Claude Code PR creation workflow documented in the system prompt (`gh pr create` with HEREDOC body, Summary + Test plan format, short title under 70 chars).

## Project-specific additions

1. Verify the current branch is not `main`/`master` before anything else.
2. Push to remote with `-u` if the branch is not yet tracked.
3. If `.github/pull_request_template.md` exists, let `gh` auto-apply it; do not override.
4. Confirm the generated PR title and body with the user via `AskUserQuestion` before running `gh pr create`.

## Error handling

| Situation | Action |
|---|---|
| On main/master branch | Refuse with "Cannot create PR from main" |
| No remote configured | Ask user to run `git remote add origin` |
| `gh` CLI missing | Point to installation docs |
| Auth required | Ask user to run `gh auth login` |

</Instructions>
</Skill_Guide>
