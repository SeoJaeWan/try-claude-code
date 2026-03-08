# frontend-dev Skill Evaluation (English prompt, with_skill)

## Skill Read: skills/frontend-dev/SKILL.md

## Naming Convention
- useGetUserProfile following use{Verb}{Resource} pattern
- Path: {hooksRoot}/apis/queries/useGetUserProfile.ts per folder-structure rules

## TDD RED->GREEN Workflow
1. Copy tests first, RED verify (tests fail)
2. Implement hook
3. GREEN verify (tests pass)
4. Typecheck/lint/build gates

## generate.mjs Usage
- `generate.mjs api-hook useGetUserProfile --method query`

## References
- coding-rules/code-style.md
- design/ docs
- Full 14-step execution order from skill's Implementation Steps
