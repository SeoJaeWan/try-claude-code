# agent-browser — Visual Compare Reference

Commands relevant to the visual comparison workflow.
All invoked via `npx agent-browser <command>` using the Bash tool.

---

## Viewport & Navigation

```bash
# Set viewport to match reference image dimensions before capturing
npx agent-browser set viewport <width> <height>

# Navigate to target URL
npx agent-browser open <url>
```

## Screenshot Capture

```bash
# Element-level screenshot (preferred — captures only the target element)
npx agent-browser screenshot "<selector>" <output.png>

# Viewport screenshot (use only when no specific element target exists)
npx agent-browser screenshot <output.png>

# Full-page screenshot (avoid for comparison — too noisy)
npx agent-browser screenshot --full <output.png>
```

The `[selector]` argument accepts CSS selectors (`.hero`, `#pricing`, `[data-testid="card"]`) or agent-browser refs (`@e3`).

## Element Info

```bash
# Get bounding box — useful for verifying element dimensions
npx agent-browser get box "<selector>"

# Get text content of an element
npx agent-browser get text "<selector>"
```

## Wait (ensure element is rendered before capture)

```bash
# Wait for element to be visible
npx agent-browser wait "<selector>"

# Wait for specific time (ms)
npx agent-browser wait 2000
```

## JavaScript Evaluation (state seeding)

```bash
# Run arbitrary JS in the page context — use for state seeding before capture
npx agent-browser evaluate "<js expression>"

# Examples:
# Seed localStorage (e.g., Jotai atomWithStorage, next-auth session)
npx agent-browser evaluate "localStorage.setItem('windows', JSON.stringify([{id:'abc',type:'blog'}]))"

# Dispatch a DOM event to trigger interaction-gated UI (context menus, tooltips)
npx agent-browser evaluate "document.querySelector('.item').dispatchEvent(new MouseEvent('contextmenu', {bubbles:true}))"

# Inject a cookie
npx agent-browser evaluate "document.cookie = 'token=abc; path=/'"
```

After seeding, reload the page to let the app re-hydrate from the seeded state:

```bash
npx agent-browser open <url>  # reload after evaluate to apply seeded localStorage/cookies
```

## Device Emulation

```bash
# Emulate a specific device (sets viewport + user agent)
npx agent-browser set device "iPhone 12"
```
