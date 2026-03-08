# backend-dev Skill Evaluation (English prompt, with_skill)

## Skill Read: skills/backend-dev/SKILL.md

## Framework Auto-detection
- Checks package.json for @nestjs/core, @nestjs/common
- Falls back to Express/Fastify/etc.

## Test Command Selection
- NestJS: pnpm test
- Python: pytest
- Go: go test

## File Generation
- controller + service + module via generate.mjs
- TDD RED->GREEN workflow

## TDD Workflow
- Copy tests first, RED verify, implement, GREEN verify
