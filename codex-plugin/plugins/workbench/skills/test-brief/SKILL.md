---
name: test-brief
description: Create or update tests before implementation for one selected work unit. Use after brainstorm when the user says "test brief", "테스트 브리프", "테스트 먼저", "이 작업 테스트부터 만들자", or wants Codex to inspect dev wiki, current test setup, and existing patterns to write goal-focused tests that define completion criteria. This skill may edit test files only; it must not implement production code.
---

# Test Brief

Use this skill after `brainstorm` when the user wants the selected work unit's goal fixed as tests before implementation.

The goal is to create the smallest useful test surface that proves the work unit is complete. Prefer tests that encode the actual goal and contract, not broad snapshots or generic coverage.

## Core Rules

- Do NOT implement or modify production code.
- Do NOT modify generated API files, app code, components, server actions, schemas, or configuration unless the user explicitly asks to change test configuration.
- You may create or update test files, test fixtures, test mocks, and narrowly scoped test helpers.
- Do NOT add new test dependencies unless the user explicitly approves.
- Do NOT write tests for unrelated Work Units.
- Do NOT create tests that merely assert implementation details unless the selected unit is specifically about an integration boundary.
- If the current project has no suitable test harness, do not invent one. Produce a Test Brief and recommend the smallest harness decision instead.

## Inputs

Identify:

- The selected Work Unit and its Goal.
- The `brainstorm` output: Current Context, Implementation Notes, Work Steps, Risks, and Checks.
- Any issue brief evidence that defines observable behavior, API contracts, field names, or UI states.
- User constraints such as "테스트만 작성", "unit test만", "type test만", "server action 테스트만", or "파일 만들지 말고 설계만".

If the selected unit or brainstorm output is not visible, ask for that context before writing tests.

## Evidence Gathering

Gather only enough evidence to place and write tests correctly.

### Dev Wiki

- Resolve dev wiki through `${CODEX_HOME:-~/.codex}/workbench/dev-wiki` when available.
- Read only testing conventions, workflow commands, API boundary rules, and relevant graph files.
- If dev wiki is not set up, continue from repository evidence and say so briefly.

### Repository Test Context

- Inspect package scripts, test runner config, existing test files, mock patterns, and nearby feature tests.
- Prefer existing project style over introducing a new test shape.
- Look for examples of:
  - server action tests
  - API client mocks
  - generated `paths` type usage
  - Next.js API mocks such as `revalidatePath`, `cookies`, or `redirect`
  - UI component tests or route-level tests when the selected unit is UI behavior

### Goal Mapping

Map the Work Unit goal to testable assertions.

- For API boundary work, test endpoint path, method, request shape, response handling, cache invalidation, and error passthrough according to local patterns.
- For type-generation work, prefer compile-time/type-level assertions only if the project already has a pattern for them.
- For UI work, test user-visible behavior or state transitions, not layout trivia.
- For bug fixes, write a regression test that fails on the current behavior when practical.

### Test Intent

Classify the test intent before writing tests. Use the intent to decide whether tests should pass now or intentionally fail.

- **Compatibility / characterization**: Default for existing feature changes, refactors, mock-to-real API migration, generated type cleanup, or internal implementation swaps where the public behavior should remain stable. Write tests that pass on the current implementation and continue passing after the change.
- **Red / target contract**: Use for new features, missing behavior, or explicit TDD requests where no current behavior exists. These tests may fail before implementation.
- **Regression**: Use for bug fixes. When practical, write a test that fails on the current bug and passes after the fix.
- **Brief only**: Use when the test harness, placement, or observable behavior is unclear.

If intent is ambiguous, ask whether the tests should pass on the current code or intentionally fail. For compatibility work, prefer public behavior and action result assertions first. Do NOT assert future implementation details such as a new endpoint call unless the selected unit is specifically about that integration boundary, the current code already exposes it, or the user explicitly asks for target-contract tests.

### Test Naming

- Write `describe` and `it` descriptions in Korean by default.
- Keep code identifiers, function names, field names, paths, endpoints, and HTTP methods exact inside Korean descriptions.
- Make `describe` name the changed area or boundary, not just the file name.
- Make `it` state the expected behavior or changed contract in a sentence.
- Prefer names that reveal what changed and where. Avoid generic English names like `"admin-menu actions"` or `"delegates requests"`.

Example:

```ts
describe("매니저 메뉴 관리 server action", () => {
  it("Mock 목록 조회를 제거하고 GET /adminMenu API 응답을 그대로 반환한다", async () => {});
  it("카테고리 생성/수정/삭제를 /adminMenu/category API로 위임하고 body를 재가공하지 않는다", async () => {});
  it("소메뉴 생성/상세/수정/삭제를 /adminMenu/detailMenu API 계약으로 호출한다", async () => {});
});
```

## Workflow

1. Classify the Test Intent and decide whether to write tests or only produce a test brief.
   - Write tests when the project has a clear test harness and the target behavior can be isolated.
   - Produce only a brief when test placement is unclear, harness is absent, or required dependencies are missing.
2. Choose the smallest test layer that proves the selected unit and matches the Test Intent:
   - type/contract test
   - unit test
   - server action/API boundary test
   - component interaction test
   - route/e2e test only when lower layers cannot prove the goal
3. Create or update only the necessary test files.
4. Run the narrowest relevant test command when practical.
   - If tests are expected to fail before implementation, report that as expected and include the meaningful failure.
   - If the test command cannot run, explain why.
5. Do not fix production code to make the tests pass.

## Output Format

Use Korean for user-facing prose unless the user asks otherwise. Keep code identifiers, paths, commands, issue keys, field names, and URLs exact.

```markdown
**Test Brief**

- Target Unit: <selected unit>
- Test Goal: <what these tests prove>
- Test Intent: <Compatibility / Red / Regression / Brief only>
- Test Layer: <type/unit/server action/component/e2e/brief only>
- Existing Pattern: <nearby test files or "no clear pattern">

**Test Cases**
1. <Korean test description and behavior/contract assertion>
2. <Korean test description and behavior/contract assertion>
3. <Korean edge/error/cache assertion when relevant>

**Files**
- Added/Updated: <test files changed, or "none">
- Production Code: unchanged

**Mocks / Fixtures**
- <client mock, server action mock, fixture, generated type assumption>

**Run Result**
- <command run and pass/fail/blocked>

**Implementation Handoff**
- <what the implementation should now satisfy>
```

If no tests were written, keep **Files** as `none` and explain the blocker under **Run Result** or **Implementation Handoff**.

## Quality Bar

A good `test-brief` gives the implementer a clear target: "이 테스트를 통과시키면 이 Work Unit의 핵심 목표는 충족된다."

It should make implementation safer without taking over the implementation itself.
