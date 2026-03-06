---
name: pr
description: "Creates a GitHub Pull Request. Triggered by 'PR', 'open a PR', 'pull request', 'PR 올려줘', '풀리퀘' requests."
model: haiku
allowed-tools: Bash, Read, Glob, AskUserQuestion
---

<Skill_Guide>
<Purpose>
Analyze the current branch's changes and create a Pull Request on GitHub.
</Purpose>

<Instructions>

# Pull Request Creation

Analyze changes on the current branch and create a PR.

## Current State

```
Current branch: !`git branch --show-current`
Remote status: !`git status -sb`
Diff from main: !`git diff main...HEAD --stat`
Commit history: !`git log main..HEAD --oneline`
```

## Execution Order

1. **Check status** - Verify not on main branch and that changes exist
2. **Check push** - Push to remote if needed
3. **Check PR template** - Search for `.github/pull_request_template.md`
4. **Write PR content** - Generate title and body
5. **User confirmation** - Confirm via AskUserQuestion
6. **Create PR** - Run gh pr create

## PR Body Format

```markdown
## Summary
{1-2 line summary}

## Changes
- {change 1}
- {change 2}

## Test plan
- [ ] Verified working in local environment
- [ ] {additional test items}

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Error Handling

| Situation | Handling |
|-----------|----------|
| On main branch | Inform "Cannot create PR from main" |
| No remote repository | Guide to run "git remote add origin" |
| gh CLI not installed | Provide installation instructions |
| Authentication required | Guide to run "gh auth login" |

## Notes

- Use HEREDOC to pass the PR body
- PR template is applied automatically if present
- gh CLI is required

---
- **Final step:** Yes

</Instructions>
</Skill_Guide>
