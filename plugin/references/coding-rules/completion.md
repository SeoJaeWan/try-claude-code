# Completion Requirements

Verification steps that all development agents must execute directly before claiming completion.

## Standard Checklist

0. **When config sync is needed**: invoke `init-coding-rules`
   - Follow the 6-step workflow (Read rules -> Detect framework -> Audit -> Plan -> Approve -> Apply)
   - Resolve all file-group approval questions explicitly
   - Do not install/update dependencies without explicit approval

1. **Run tests**: `pnpm test`
   - All tests must pass
   - Fix directly and re-run on failure

2. **Type check**: `pnpm run typecheck` (fallback: `pnpm exec tsc --noEmit`)
   - 0 type errors
   - Fix directly and re-run on failure

3. **Lint**: `pnpm lint --fix`
   - Fix any errors that cannot be auto-fixed
   - Repeat until lint is clean

## Exceptions

- No test script: skip `pnpm test` (document the reason)
- No lint config: skip `pnpm lint`
- No TypeScript: skip `typecheck`

## Principles

- Do not delegate these steps to the main context. Agents execute them directly.
- Do not claim completion based on "it should work" assumptions.
- For config conflicts, do not auto-decide silently. Surface the decision (`keep` or `apply`) with rationale.
