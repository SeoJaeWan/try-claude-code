# init-coding-rules Skill Evaluation (English prompt, with_skill)

## Skill Read: skills/init-coding-rules/SKILL.md

## All 9 Coding-rules Docs Read
code-style, naming, typescript, git, package-manager, comments, testing, folder-structure, completion

## Framework Detection
- From package.json devDependencies
- No package.json found -> Base TypeScript fallback

## Per-group Approval
1. ESLint rules mapped to coding-rules sources
2. TSConfig strict options
3. commitlint config
4. husky + lint-staged hooks

## Safe Install Pattern
- Outputs pnpm add -D command but does NOT auto-run it
- User must approve and execute manually
