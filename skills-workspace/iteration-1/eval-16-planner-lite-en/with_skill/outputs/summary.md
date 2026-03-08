# planner-lite Skill Evaluation (English prompt, with_skill)

## Skill Read: skills/planner-lite/SKILL.md

## Branch: Header and owner_agent Validation
- Plan file must have **Branch:** header and owner_agent: fields per phase
- Validates agents/*.md existence

## No Nested Worktree
- Agent() called WITHOUT isolation: "worktree"
- Agents cd into worktree directory instead
- Prevents nested worktree creation

## Sequential Phase Execution
- Phases run in strict order with verification between phases

## Merge and Cleanup
- git worktree remove --force -> git merge --no-ff -> git branch -d
- On conflict: task branch preserved for manual resolution

## Execution Outcome
Validation failure - plan file does not exist, halts before git operations.
