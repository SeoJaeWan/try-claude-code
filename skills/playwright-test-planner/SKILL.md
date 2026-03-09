---
name: playwright-test-planner
description: E2E test planner that explores running web applications via browser to create comprehensive test plans. Use this skill when the user wants to create test scenarios, plan E2E tests, explore a web app for testable flows, generate test specs, or write QA documentation for a website. Also trigger when the user mentions "test plan", "test scenarios", "specs", or wants to understand what to test in their web application. Even if the user simply says "테스트 플랜 만들어줘" or "이 웹앱 어떤 테스트가 필요해?", this skill should be used.
model: sonnet
context: fork
agent: playwright-test-planner
---

<Skill_Guide>
<Purpose>
Explore running web applications via browser and create comprehensive, structured test plans as markdown specs. Works with Playwright MCP tools to navigate real pages, identify interactive elements, and produce test scenario documents.
</Purpose>

<Instructions>
# playwright-test-planner

Create E2E test plans by exploring live web applications through a real browser.

---

## Why browser-based planning matters

Writing test scenarios from code alone misses runtime behavior — dynamic elements, conditional UI, async flows. By navigating the actual running application, you observe what a real user sees and produce test plans grounded in actual application state, not assumptions.

---

## Workflow

### 1. Initialize

Invoke `planner_setup_page` once before using any other browser tools. This opens the target URL and prepares the browser for exploration.

### 2. Explore systematically

Use `browser_snapshot` to read the current page structure, and `browser_click`, `browser_type`, `browser_navigate` to interact and discover flows. Do not take screenshots unless absolutely necessary — snapshots are more token-efficient.

Follow this exploration checklist to ensure thorough coverage:

- **Navigation structure**: menus, links, breadcrumbs, routing between pages
- **Forms and inputs**: text fields, selects, checkboxes, file uploads, date pickers
- **Interactive elements**: buttons, modals, tooltips, accordions, tabs, dropdowns
- **Authentication flows**: login, logout, signup, password reset, session expiry
- **CRUD operations**: create, read, update, delete for each data entity
- **State transitions**: loading states, empty states, error states, success messages
- **Responsive behavior**: if relevant, note viewport-dependent UI changes
- **Keyboard accessibility**: tab order, focus management, keyboard shortcuts

### 3. Analyze user flows

- Map primary user journeys and critical paths
- Consider different user types (anonymous, authenticated, admin) and their typical behaviors
- Identify happy paths, edge cases, and error scenarios
- Note any cross-cutting concerns: pagination, search/filter, sorting, notifications

### 4. Design test scenarios

Each scenario must include:
- Clear, descriptive title
- **Seed file reference** (`**Seed:** \`tests/seed.spec.ts\``) — the template test file for generator to use
- Detailed step-by-step instructions specific enough for any tester to follow
- Expected outcomes for each verification point
- Assumptions about starting state (always assume blank/fresh state)
- Success criteria and failure conditions

Cover these categories:
- Happy path scenarios (normal user behavior)
- Edge cases and boundary conditions (empty inputs, max-length values, special characters)
- Error handling and validation (invalid data, network failures, unauthorized access)
- Negative testing scenarios (actions that should be blocked or produce errors)

Ensure scenarios are independent and can run in any order.

### 5. Save the plan

Submit the completed test plan using `planner_save_plan`. The plan is saved as a markdown file in `specs/`.

---

## Output language

Test plans (specs/) are written in Korean. Technical terms (UI labels, code, paths) remain in English.

---

## Critical rules

- All Playwright MCP tool calls (browser_*, planner_*) MUST be made sequentially, one at a time. The MCP server maintains a single browser instance that cannot handle concurrent operations.
- Group related scenarios under numbered headings (e.g., `### 1. 사용자 인증`, `### 2. 할 일 관리`) for the generator to map `describe` blocks.
- Each sub-scenario gets a sub-heading (e.g., `#### 1.1 유효한 로그인`) that becomes the test title.
</Instructions>
</Skill_Guide>
