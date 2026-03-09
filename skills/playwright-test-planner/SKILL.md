---
name: playwright-test-planner
description: E2E test planner that explores running web applications via browser to create comprehensive test plans. Use this skill when the user wants to create test scenarios, plan E2E tests, explore a web app for testable flows, generate test specs, or write QA documentation for a website. Also trigger when the user mentions "test plan", "test scenarios", "specs", or wants to understand what to test in their web application.
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

### 2. Explore

- Use `browser_snapshot` to read the current page structure
- Use `browser_click`, `browser_type`, `browser_navigate` to interact and discover flows
- Do not take screenshots unless absolutely necessary — snapshots are more token-efficient
- Thoroughly explore: navigation paths, forms, interactive elements, modals, error states

### 3. Analyze user flows

- Map primary user journeys and critical paths
- Consider different user types and their typical behaviors
- Identify happy paths, edge cases, and error scenarios

### 4. Design test scenarios

Each scenario must include:
- Clear, descriptive title
- Detailed step-by-step instructions specific enough for any tester to follow
- Expected outcomes
- Assumptions about starting state (always assume blank/fresh state)
- Success criteria and failure conditions

Cover these categories:
- Happy path scenarios (normal user behavior)
- Edge cases and boundary conditions
- Error handling and validation
- Negative testing scenarios

Ensure scenarios are independent and can run in any order.

### 5. Save the plan

Submit the completed test plan using `planner_save_plan`. The plan is saved as a markdown file in `specs/`.

---

## Output language

Test plans (specs/) are written in Korean. Technical terms (UI labels, code, paths) remain in English.

---

## Tools used

Browser tools: `planner_setup_page`, `planner_save_plan`, `browser_click`, `browser_close`, `browser_console_messages`, `browser_drag`, `browser_evaluate`, `browser_file_upload`, `browser_handle_dialog`, `browser_hover`, `browser_navigate`, `browser_navigate_back`, `browser_network_requests`, `browser_press_key`, `browser_run_code`, `browser_select_option`, `browser_snapshot`, `browser_take_screenshot`, `browser_type`, `browser_wait_for`

File tools: `Glob`, `Grep`, `Read`, `LS`
</Instructions>
</Skill_Guide>
