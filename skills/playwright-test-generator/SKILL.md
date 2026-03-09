---
name: playwright-test-generator
description: Playwright E2E test generator that converts test plans (specs/) into executable Playwright test files by manually executing each step in the browser and recording actions. Use this skill when the user wants to generate test code from a test plan, create .spec.ts files, convert test scenarios into Playwright tests, or automate test writing from specs. Also trigger when the user mentions "generate tests", "write spec", "create test from plan", or has a specs/ markdown file they want turned into executable tests.
---

<Skill_Guide>
<Purpose>
Convert test plan documents (specs/) into executable Playwright test files (.spec.ts) by manually executing each step in a real browser and recording the interactions into test code.
</Purpose>

<Instructions>
# playwright-test-generator

Transform markdown test plans into working Playwright test code by executing each step live in the browser.

---

## Why live execution matters

Generating tests from a plan without actually running the steps leads to broken selectors, wrong assertions, and flaky tests. By executing each step in a real browser first, the generated test code reflects actual element references, timing, and page behavior.

---

## Workflow

For each test scenario in the plan:

### 1. Read the test plan

Obtain the full test plan with all steps and verification criteria from `specs/`.

### 2. Set up the page

Run `generator_setup_page` to initialize the browser for this specific scenario.

### 3. Execute steps live

For each step and verification in the scenario:
- Use Playwright browser tools to manually execute it in real-time
- Use the step description as the intent for each tool call
- `browser_click`, `browser_type`, `browser_snapshot` etc.

### 4. Read the execution log

After completing all steps, retrieve the recorded interaction log via `generator_read_log`. This log contains the actual Playwright actions, selectors, and best practices observed during execution.

### 5. Write the test file

Immediately after reading the log, invoke `generator_write_test` with the generated source code.

Requirements for the generated file:
- Single test per file
- File name must be filesystem-friendly scenario name
- Test placed in a `describe` block matching the top-level test plan item
- Test title matches the scenario name
- Comment with step text before each step execution (no duplicate comments for multi-action steps)
- Apply best practices from the execution log

### Example

For a plan like:

```markdown file=specs/plan.md
### 1. Adding New Todos
**Seed:** `tests/seed.spec.ts`

#### 1.1 Add Valid Todo
**Steps:**
1. Click in the "What needs to be done?" input field
```

Generate:

```ts file=add-valid-todo.spec.ts
// spec: specs/plan.md
// seed: tests/seed.spec.ts

test.describe('Adding New Todos', () => {
  test('Add Valid Todo', async ({ page }) => {
    // 1. Click in the "What needs to be done?" input field
    await page.click(...);
  });
});
```

---

## Tools used

Browser tools: `generator_setup_page`, `generator_read_log`, `generator_write_test`, `browser_click`, `browser_drag`, `browser_evaluate`, `browser_file_upload`, `browser_handle_dialog`, `browser_hover`, `browser_navigate`, `browser_press_key`, `browser_select_option`, `browser_snapshot`, `browser_type`, `browser_verify_element_visible`, `browser_verify_list_visible`, `browser_verify_text_visible`, `browser_verify_value`, `browser_wait_for`

File tools: `Glob`, `Grep`, `Read`, `LS`
</Instructions>
</Skill_Guide>
