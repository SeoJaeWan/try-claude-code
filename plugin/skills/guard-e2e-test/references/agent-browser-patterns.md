# agent-browser Patterns Reference

agent-browser CLI usage patterns and token optimization guide.

---

## Quick Start (npx — no install)

```bash
# First time: install Chromium
npx agent-browser install

# Open a page
npx agent-browser open http://localhost:3000
```

All commands below are invoked via `npx agent-browser <command>`.
The agent uses the Bash tool to execute these commands — no MCP server required.

---

## Core Concept

agent-browser is an AI-optimized browser automation CLI.
Replaces Playwright MCP's `browser_*` tools with ~93% token savings.

### Snapshot + Ref System

```
1. snapshot           →  Returns compressed view filtered to interactive elements only
2. Ref assignment     →  Each element gets a short identifier (@e1, @e2, @e3 ...)
3. Operate via ref    →  click @e1, type @e2 "hello", etc.
4. Done response      →  Successful action returns "Done" (6 chars), no full tree re-send
```

---

## CLI Command Reference

### Navigation & Page Control

| Command | Description |
|---|---|
| `open <url>` | Navigate to URL (aliases: goto, navigate) |
| `get url` | Get current URL |
| `get title` | Get current page title |
| `screenshot [path]` | Take screenshot |

### Snapshot & Element Discovery

| Command | Description |
|---|---|
| `snapshot` | Accessibility tree with refs — compressed, interactive elements only |
| `get text <selector>` | Get text content of an element |
| `get html <selector>` | Get innerHTML of an element |
| `get value <selector>` | Get input value |

### Interaction (via ref or selector)

| Command | Description |
|---|---|
| `click <ref>` | Click element (e.g., `click @e3`) |
| `type <ref> <text>` | Type into element |
| `fill <ref> <text>` | Clear and fill element |
| `press <key>` | Press key (Enter, Tab, etc.) |
| `hover <ref>` | Hover element |
| `scroll <direction> [px]` | Scroll up/down/left/right |

### Semantic Find (role/text/label-based)

```bash
find role button click --name "Login"
find text "Sign up" click
find label "Email" fill "user@example.com"
find placeholder "Search..." type "query"
```

### State Checks

| Command | Description |
|---|---|
| `is visible <selector>` | Check if element is visible |
| `is enabled <selector>` | Check if element is enabled |
| `is checked <selector>` | Check if checkbox is checked |

### Wait Commands

| Command | Description |
|---|---|
| `wait <selector>` | Wait for element to be visible |
| `wait --text "text"` | Wait for text to appear |
| `wait --url "pattern"` | Wait for URL to match |

### Storage & Cookies (state verification)

| Command | Description |
|---|---|
| `cookies` | Get all cookies |
| `storage local` | Get localStorage contents |
| `eval <javascript>` | Run JavaScript in page context |
| `console` | View console messages |

---

## Exploration Patterns

### Basic Exploration Flow

```
open <url> → snapshot → understand structure → interact via refs → (if needed) snapshot → ...
```

### Token-Efficient Exploration

| Situation | Recommended Approach |
|---|---|
| First page entry | `snapshot` — must understand structure |
| After button click | Trust `Done` — no snapshot needed (same-page change) |
| After page navigation | `snapshot` — new page structure needs understanding |
| Checking error messages | `get text <selector>` or `eval` — targeted verification |
| After form input | Trust `Done` — only snapshot if input validation check needed |
| URL check after transition | `get url` — 1 command instead of full snapshot |

### Key Principle

**After interactions, do not request a snapshot by default.**
Only request snapshots explicitly at verification-critical points.

---

## Non-Interactive Element Handling

agent-browser's `snapshot` includes **interactive elements only**.
The following elements are invisible in the default snapshot:

- Error messages, success messages
- Body text, status indicators
- List items (`<li>`)
- Table data (`<td>`)
- Loading spinners

### When Verification is Needed

guard-e2e-test frequently needs to verify non-interactive elements
(e.g., welcome messages after route transitions, status indicators).
Use targeted commands instead of full snapshot:

1. **`get text <selector>`** — get text of a specific element (most efficient)
2. **`eval document.querySelector('[data-testid="greeting"]').textContent`** — direct DOM query
3. **`storage local`** / **`cookies`** — verify client-side state directly

**Principle: Verification accuracy takes priority over token efficiency.**
At journey verification checkpoints, use targeted verification commands.

---

## Exploration-to-Test Mapping

### Locator Collection

```
From snapshot results:
- @e3: button "Login"          → page.getByRole('button', { name: 'Login' })
- @e5: textbox "Email"         → page.getByRole('textbox', { name: 'Email' })
- data-testid="login-button"   → page.getByTestId('login-button')
```

Map ref roles and names to Playwright locators for use in test code.

### URL Collection

Record URL changes at each step for navigation assertions:

```bash
# After each route transition:
npx agent-browser get url
# Step 1: http://localhost:3000/
# Step 2: http://localhost:3000/login
# Step 3: http://localhost:3000/dashboard
```

### State Verification Collection

```bash
# Check localStorage after login
npx agent-browser storage local
# Check cookies after logout (should be empty)
npx agent-browser cookies
# Check specific text on page
npx agent-browser get text '[data-testid="greeting"]'
```

---

## Token Savings Summary

| Aspect | Playwright MCP | agent-browser CLI |
|---|---|---|
| Post-action response | Full a11y tree (~12,891 chars) | "Done" (6 chars) |
| Element identification | Per-tool parameters | Refs (@e1, @e2) |
| Snapshot | Auto-returned every action | On-demand only |
| Tool surface | 26+ MCP tool schemas in context | 0 (uses Bash) |
| Token efficiency | Baseline | ~93% savings |
| Non-interactive elements | Always included | Excluded by default, targeted query available |
