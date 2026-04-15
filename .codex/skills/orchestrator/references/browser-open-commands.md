# Browser Open Commands

Use these commands only when the runtime can open local browser tabs and the user gate should expose local markdown files directly in a browser.

Prefer opening `file:///...` URIs so browser markdown extensions can render the raw `.md` files.

## Windows PowerShell

Build file URIs:

```powershell
$paths = @(
    "C:\path\to\user-gate.md",
    "C:\path\to\plan.md",
    "C:\path\to\phases\01-example.md"
)
$uris = $paths | ForEach-Object { [System.Uri]::new((Resolve-Path $_).Path).AbsoluteUri }
```

Prefer Chrome when available:

```powershell
if (Get-Command chrome.exe -ErrorAction SilentlyContinue) {
    Start-Process chrome.exe $uris
} elseif (Get-Command msedge.exe -ErrorAction SilentlyContinue) {
    Start-Process msedge.exe $uris
} else {
    $uris | ForEach-Object { Start-Process $_ }
}
```

## macOS

Prefer Chrome when available:

```bash
open -a "Google Chrome" "/absolute/path/to/user-gate.md" "/absolute/path/to/plan.md" "/absolute/path/to/phases/01-example.md"
```

Fallback to the default browser:

```bash
open "/absolute/path/to/user-gate.md"
open "/absolute/path/to/plan.md"
open "/absolute/path/to/phases/01-example.md"
```

## Linux

Prefer Chrome when available:

```bash
google-chrome "file:///absolute/path/to/user-gate.md" "file:///absolute/path/to/plan.md" "file:///absolute/path/to/phases/01-example.md"
```

Fallback to the default browser:

```bash
xdg-open "file:///absolute/path/to/user-gate.md"
xdg-open "file:///absolute/path/to/plan.md"
xdg-open "file:///absolute/path/to/phases/01-example.md"
```

## Notes

- Open `user-gate.md`, the current `plan.md`, and every linked phase detail file in separate tabs.
- If browser opening is blocked or unavailable, report the exact local file paths to the user instead of silently skipping the step.
- Do not convert the markdown into HTML unless the user explicitly asks for a separate rendered artifact.
