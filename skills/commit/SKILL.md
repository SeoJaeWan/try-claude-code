---
name: commit
description: "Commits Git changes following Conventional Commits rules. Triggered by 'commit', 'commit this', '/commit', '커밋', '커밋해줘' requests."
model: haiku
allowed-tools: Bash, Read, Glob, AskUserQuestion
---

<Skill_Guide>
<Purpose>
Check Git status and commit staged changes following Conventional Commits rules.
</Purpose>

<Instructions>

# Git Commit

Check Git status and commit following Conventional Commits rules.

## Current State

```
Current branch: !`git branch --show-current`
Git status: !`git status`
Changed files: !`git diff --stat`
Recent commits: !`git log -3 --oneline`
```

## Execution Order

1. **Branch check** - Ask via AskUserQuestion whether to create a new branch
   - Options: "Commit on current branch" / "Create new branch then commit"
   - If new branch selected: ask for branch name and run `git checkout -b {branch-name}`
2. **Analyze changes** - Determine commit type based on the information above
3. **Write commit message** - Generate message based on change content
4. **commitlint pre-check** (optional - skip if commitlint is not installed)
   - Check if `commitlint.config.mjs` exists AND `pnpm exec commitlint --version` runs successfully
   - If both exist: proceed with commitlint validation in step 6
   - If missing: skip step 6 and proceed without commitlint
5. **Execute commit** - git add, git commit
6. **Validate commit message** (only if commitlint is available from step 4)
   - Run `pnpm exec commitlint --last --verbose`
   - If failed: amend commit message and re-run commitlint until pass
7. **Confirm push** - Ask via AskUserQuestion

## Commit Type Rules

| Change Type | Type |
|-------------|------|
| New file added | `feat` |
| Bug fix | `fix` |
| Code improvement | `refactor` |
| Style/CSS | `style` |
| Documentation update | `docs` |
| Config/build | `chore` |
| Tests | `test` |

## Commit Message Format

```
{type}: {concise summary} (under 50 characters)
```

- **Subject line only. No body, no footer.** 본문(description)을 절대 작성하지 않는다.
- `-m` 플래그 하나만 사용 (`git commit -m "feat: ..."`)

## Notes

- Force Push is strictly prohibited
- Do not commit if there are no changes
- Do not bypass commitlint validation (when commitlint is available)

---

**Integration:**
- **Previous:** N/A (user-invoked directly)
- **Next:** none
- **Final step:** Yes

</Instructions>
</Skill_Guide>
