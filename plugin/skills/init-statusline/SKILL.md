---
name: init-statusline
description: "One-command full setup -- bootstrap statusline files, wire settings.json, and verify end-to-end. No restart required. Triggers on 'init-statusline', 'statusline setup', 'statusline init', '상태줄 초기화', '상태줄 설정'."
allowed-tools: Bash, Read, Write, Edit
---

<Skill_Guide>
<Purpose>
Set up the try-claude-code multi-line box UI status line in a single command.
Copies statusline files to a stable path and registers the command in settings.json.
</Purpose>

<Instructions>

# Init Statusline

## When to use

- **First install**: right after `claude plugin install try-claude-code` and `/reload-plugins`
- **Plugin update**: after updating and reloading, if statusline is not displaying
- **Troubleshooting**: when status line is empty or shows errors

## Step 0: Resolve plugin paths

The environment variable `CLAUDE_PLUGIN_ROOT` is only available inside hook/skill runtime contexts.
Resolve it from known directory conventions:

```bash
# Find CLAUDE_PLUGIN_ROOT (versioned cache directory)
CLAUDE_PLUGIN_ROOT=$(ls -d ~/.claude/plugins/cache/try-claude-code/try-claude/*/ 2>/dev/null | head -1 | sed 's:/$::')
```

If empty, the plugin is not installed. Tell the user to run `claude plugin install try-claude-code` first, then stop.

## Step 1: Copy statusline files to stable path

Copy from plugin cache to `~/.claude/statusline/`:

```bash
SRC="$CLAUDE_PLUGIN_ROOT/statusline"
DST="$HOME/.claude/statusline"

mkdir -p "$DST/lib"

cp "$SRC/status-line.mjs"          "$DST/status-line.mjs"
cp "$SRC/gmail-collect.mjs"        "$DST/gmail-collect.mjs"
cp "$SRC/lib/box-renderer.mjs"     "$DST/lib/box-renderer.mjs"
cp "$SRC/lib/gmail-collector.mjs"  "$DST/lib/gmail-collector.mjs"
cp "$SRC/lib/status-cache.mjs"     "$DST/lib/status-cache.mjs"
```

Verify the main file exists:
```bash
ls -la "$DST/status-line.mjs"
```

## Step 2: Wire settings.json

Read `~/.claude/settings.json`, set `statusLine` to:

```json
{
  "type": "command",
  "command": "node <HOMEDIR>/.claude/statusline/status-line.mjs"
}
```

Where `<HOMEDIR>` is the user's actual home directory absolute path (e.g. `C:/Users/username` or `/home/username`).

**Important:**
- Do NOT overwrite unrelated fields -- merge only the `statusLine` key
- Use forward slashes in the path even on Windows
- Use the Edit tool to modify settings.json

## Step 3: End-to-end verification

Pipe sample JSON through the statusline and confirm output is not empty:

```bash
echo '{"rate_limits":{"five_hour":{"used_percentage":1},"seven_day":{"used_percentage":1}},"model":{"id":"test"},"cost":{"total_duration_ms":60000,"total_cost_usd":0.50},"context_window":{"used_percentage":10}}' \
  | node "$HOME/.claude/statusline/status-line.mjs"
```

The output should be a multi-line box with CORE, SUPPLY, and GIT sections.

## Step 4: Report results

Print a summary:
- Whether files were copied successfully
- Whether settings.json was updated
- Whether the verification test passed
- Tell the user the status line is now active

## Error conditions

| Condition | Action |
|---|---|
| Plugin cache not found | Plugin not installed. Tell user to install first |
| statusline/ directory missing in plugin | Plugin version too old. Tell user to update |
| settings.json parse error | Back up the file, then write minimal valid JSON |
| Verification output empty | Print error details and check file paths |

## Notes

- This skill is idempotent -- safe to run multiple times
- After running, the status line works immediately without restarting Claude Code
- The SessionStart hook will keep files in sync on future sessions automatically

</Instructions>
</Skill_Guide>
