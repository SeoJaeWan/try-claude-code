---
name: playwright-test-planner
description: E2E test planner that explores running web applications via browser to create comprehensive test plans. Use this skill when the user wants to create test scenarios, plan E2E tests, explore a web app for testable flows, generate test specs, or write QA documentation for a website. Also trigger when the user mentions "test plan", "test scenarios", "specs", or wants to understand what to test in their web application.
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

## Critical rules

- All Playwright MCP tool calls (browser_*, planner_*) MUST be made sequentially, one at a time. The MCP server maintains a single browser instance that cannot handle concurrent operations.
</Instructions>
</Skill_Guide>
