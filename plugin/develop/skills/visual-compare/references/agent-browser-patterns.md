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

## Device Emulation

```bash
# Emulate a specific device (sets viewport + user agent)
npx agent-browser set device "iPhone 12"
```
