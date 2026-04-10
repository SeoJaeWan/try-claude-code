---
name: statusline
description: "Toggle the status line on/off, or bootstrap it on first run. Triggers on 'statusline', 'statusline on', 'statusline off', '상태줄', '상태줄 켜기', '상태줄 끄기'."
allowed-tools: Bash, Read, Write, Edit
---

<Skill_Guide>
<Purpose>
Single command to set up, enable, or disable the multi-line box UI status line.
Automatically detects current state and acts accordingly.
</Purpose>

<Instructions>

# Statusline Toggle

## Decision flow

Read `~/.claude/settings.json` and check the `statusLine` field.

| State | Action |
|---|---|
| `statusLine` key missing or `null` AND `~/.claude/statusline/status-line.mjs` does NOT exist | **First run** — full bootstrap (copy files + wire setting) |
| `statusLine.command` contains `status-line.mjs` | **Active** — disable (set `statusLine` to `null`) |
| `statusLine` is missing/`null` AND `~/.claude/statusline/status-line.mjs` exists | **Inactive** — re-enable (restore the command) |

> If the user explicitly says "on" or "off" ("켜기"/"끄기"), skip detection and force that action.

## Action: Bootstrap (first run)

### 1. Resolve plugin paths

```bash
CLAUDE_PLUGIN_ROOT=$(ls -d ~/.claude/plugins/cache/try-claude-code-statusline/try-claude/*/ 2>/dev/null | head -1 | sed 's:/$::')
```

If empty, the plugin is not installed. Tell the user to run `claude plugin install try-claude-code` first, then stop.

### 2. Copy files to stable path

```bash
SRC="$CLAUDE_PLUGIN_ROOT/src"
DST="$HOME/.claude/statusline"

mkdir -p "$DST/lib"

cp "$SRC/status-line.mjs"          "$DST/status-line.mjs"
cp "$SRC/gmail-collect.mjs"        "$DST/gmail-collect.mjs"
cp "$SRC/lib/box-renderer.mjs"     "$DST/lib/box-renderer.mjs"
cp "$SRC/lib/gmail-collector.mjs"  "$DST/lib/gmail-collector.mjs"
cp "$SRC/lib/status-cache.mjs"     "$DST/lib/status-cache.mjs"
```

### 3. Wire settings.json

Set `statusLine` to:

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

### 4. Verify

```bash
echo '{"rate_limits":{"five_hour":{"used_percentage":1},"seven_day":{"used_percentage":1}},"model":{"id":"test"},"cost":{"total_duration_ms":60000,"total_cost_usd":0.50},"context_window":{"used_percentage":10}}' \
  | node "$HOME/.claude/statusline/status-line.mjs"
```

Report: "Statusline enabled."

## Action: Disable

Set `statusLine` to `null` in `~/.claude/settings.json`.
Do NOT delete the files in `~/.claude/statusline/` -- they are reused on re-enable.
Do NOT touch any other fields in settings.json.

Report: "Statusline disabled."

## Action: Enable (re-enable)

Set `statusLine` back to the command object (same as bootstrap step 3).
Do NOT re-copy files -- they already exist.

Report: "Statusline enabled."

## Error conditions

| Condition | Action |
|---|---|
| Plugin cache not found on bootstrap | Plugin not installed. Tell user to install first |
| src/ directory missing in plugin | Plugin version too old. Tell user to update |
| settings.json parse error | Back up the file, then write minimal valid JSON |
| Verification output empty | Print error details and check file paths |

</Instructions>
</Skill_Guide>
