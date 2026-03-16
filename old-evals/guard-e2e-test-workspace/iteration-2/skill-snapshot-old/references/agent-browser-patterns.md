# agent-browser Patterns Reference

agent-browser usage patterns and token optimization guide.

---

## Core Concept

agent-browser is an AI-optimized browser automation interface.
Replaces Playwright MCP's `browser_*` tools with ~93% token savings.

### Snapshot + Ref System

```
1. Request snapshot  →  Returns compressed view filtered to interactive elements only
2. Ref assignment    →  Each element gets a short identifier (@e1, @e2, @e3 ...)
3. Operate via ref   →  click @e1, type @e2 "hello", etc.
4. Done response     →  Successful action returns "Done" (6 chars), no full tree re-send
```

---

## Exploration Patterns

### Basic Exploration Flow

```
navigate → snapshot → understand structure → interact via refs → (if needed) snapshot → ...
```

### Token-Efficient Exploration

| Situation                  | Recommended Approach                                              |
|---|---|
| First page entry           | `snapshot` — must understand structure                            |
| After button click         | Trust `Done` — no snapshot needed (same-page change)              |
| After page navigation      | `snapshot` — new page structure needs understanding               |
| Checking error messages    | `snapshot` (full) — non-interactive element verification required |
| After form input           | Trust `Done` — only snapshot if input validation check is needed  |

### Key Principle

**After interactions, do not request a snapshot by default.**
Only request snapshots explicitly at verification-critical points.

---

## Non-Interactive Element Handling

agent-browser's compressed snapshot includes **interactive elements only**.
The following elements are invisible in the default snapshot:

- Error messages, success messages
- Body text, status indicators
- List items (`<li>`)
- Table data (`<td>`)
- Loading spinners

### When Verification is Needed

guard-e2e-test frequently needs to verify non-interactive elements
(e.g., welcome messages after route transitions, status indicators):

1. **Full snapshot** — request the complete a11y tree
   - Token cost equals Playwright MCP, but accuracy takes priority
2. **evaluate** — directly query a specific element
   - Efficient when the DOM selector is known

**Principle: Verification accuracy takes priority over token efficiency.**
At journey verification checkpoints, always use full snapshot or evaluate.

---

## Information Collection Patterns

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

```
Step 1: / (home)
Step 2: /login (login page)
Step 3: /dashboard (post-login redirect)
```

### State Change Collection

Record screen state differences before and after route transitions:

```
Before: "Login" button visible
After:  "Welcome, User" text visible + "Logout" button visible
```

---

## Playwright MCP Comparison Summary

| Aspect               | Playwright MCP                  | agent-browser                  |
|---|---|---|
| Post-action response  | Full a11y tree (~12,891 chars)  | "Done" (6 chars)               |
| Element identification| Per-tool parameters             | Refs (@e1, @e2)                |
| Snapshot              | Auto-returned                   | On-demand                      |
| Tool count            | 26+                             | 2-3                            |
| Token efficiency      | Baseline                        | ~93% savings                   |
| Non-interactive elements | Always included              | Excluded by default, included on request |
