---
name: statusline
description: "Toggle the status line on/off, switch display mode, or bootstrap it on first run. Triggers on 'statusline', 'statusline on', 'statusline off', 'statusline inline', 'statusline box', '상태줄', '상태줄 켜기', '상태줄 끄기', '상태줄 인라인', '상태줄 박스', '상태줄 모드'."
allowed-tools: Bash, Read, Write, Edit
---

<Skill_Guide>
<Purpose>
Single command to set up, enable, disable, or switch the display mode of the Claude Code status line.
Automatically detects current state and acts accordingly.
</Purpose>

<Instructions>

# Statusline Management

## Decision flow

First, check if the request is about **mode switching** (inline/box). If so, go directly to "Action: Mode Switch" — skip the on/off detection entirely.

Otherwise, read `~/.claude/settings.json` and check the `statusLine` field.

| State | Action |
|---|---|
| `statusLine` key missing or `null` AND `~/.claude/statusline/status-line.mjs` does NOT exist | **First run** — full bootstrap (copy files + wire setting) |
| `statusLine.command` contains `status-line.mjs` | **Active** — disable (set `statusLine` to `null`) |
| `statusLine` is missing/`null` AND `~/.claude/statusline/status-line.mjs` exists | **Inactive** — re-enable (restore the command) |

> If the user explicitly says "on" or "off" ("켜기"/"끄기"), skip detection and force that action.

---

## Action: Mode Switch

Triggered by: `statusline inline`, `statusline box`, `상태줄 인라인`, `상태줄 박스`, `상태줄 모드`

The config file lives at `~/.claude/statusline/config.json`.  
The `mode` key accepts `"inline"` or `"box"` (default when key/file is absent).

### Detect current mode

```bash
cat ~/.claude/statusline/config.json 2>/dev/null || echo '{}'
```

### Switch to inline mode

Write `{"mode":"inline"}` to `~/.claude/statusline/config.json`.

```bash
mkdir -p ~/.claude/statusline
echo '{"mode":"inline"}' > ~/.claude/statusline/config.json
```

Report: "Status line switched to **inline** mode."  
Explain what inline mode shows:  
> `model │ ⏱duration │ CTX:% ~$cost │ 5h:%(time↓) │ 7d:%(time↓) │ cache:% │ branch`

### Switch to box mode

Write `{"mode":"box"}` to `~/.claude/statusline/config.json`.

```bash
mkdir -p ~/.claude/statusline
echo '{"mode":"box"}' > ~/.claude/statusline/config.json
```

Report: "Status line switched to **box** mode."

### Show current mode (when user asks without specifying target)

Read the config, report the current mode, and ask which one they want.

---

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
echo '{"rate_limits":{"five_hour":{"used_percentage":22,"resets_at":1776304800},"seven_day":{"used_percentage":3,"resets_at":1776834000}},"model":{"id":"claude-sonnet-4-6"},"cost":{"total_duration_ms":521000,"total_cost_usd":1.14},"context_window":{"used_percentage":13,"current_usage":{"input_tokens":1,"cache_read_input_tokens":20863,"cache_creation_input_tokens":6008}}}' \
  | node "$HOME/.claude/statusline/status-line.mjs"
```

The output must include rate-limit percentages with time-to-reset in parentheses (e.g. `(1h2m↓)`).  
If those are missing, the installed `status-line.mjs` is outdated — tell the user to re-run bootstrap to update the files.

Report: "Statusline enabled."

---

## Action: Disable

Set `statusLine` to `null` in `~/.claude/settings.json`.
Do NOT delete the files in `~/.claude/statusline/` -- they are reused on re-enable.
Do NOT touch any other fields in settings.json.

Report: "Statusline disabled."

---

## Action: Enable (re-enable)

Set `statusLine` back to the command object (same as bootstrap step 3).
Do NOT re-copy files -- they already exist.

Report: "Statusline enabled."

---

## Error conditions

| Condition | Action |
|---|---|
| Plugin cache not found on bootstrap | Plugin not installed. Tell user to install first |
| src/ directory missing in plugin | Plugin version too old. Tell user to update |
| settings.json parse error | Back up the file, then write minimal valid JSON |
| Verification output empty | Print error details and check file paths |
| `(↓)` missing from verify output | Installed version is outdated. Re-run bootstrap to update files |

</Instructions>
</Skill_Guide>
