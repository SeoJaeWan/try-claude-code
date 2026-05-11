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

## Step 0 — Always sync runtime files first (BEFORE any action)

**Run this on EVERY `/statusline` invocation**, regardless of intent (bootstrap, enable, disable, mode switch). It guarantees `~/.claude/statusline/` mirrors the installed plugin's `src/`, so files added in plugin updates are picked up automatically without manual intervention.

### Resolve plugin cache

```bash
CLAUDE_PLUGIN_ROOT=$(ls -d ~/.claude/plugins/cache/try-claude-code-statusline/try-claude/*/ 2>/dev/null | sort -V | tail -1 | sed 's:/$::')
```

If empty:
- For a first-run intent (no `~/.claude/statusline/status-line.mjs`), abort and tell the user to install the plugin.
- Otherwise, skip sync and continue with toggle/mode-switch logic.

### Mirror `src/` → runtime (recursive, idempotent)

```bash
SRC="$CLAUDE_PLUGIN_ROOT/src"
DST="$HOME/.claude/statusline"

if [ -d "$SRC" ]; then
  mkdir -p "$DST/lib"
  cp -r "$SRC/." "$DST/"
fi
```

Do NOT hardcode a file list — copy the entire `src/` tree. New `.mjs` files added in future plugin versions are picked up for free.

> Rationale: the plugin's SessionStart `sync-hook.mjs` uses a fixed whitelist that can drift from `src/`. By always mirroring at the start of every skill invocation, `/statusline` itself becomes the self-healing path — re-running `/statusline` recovers any missing/stale file.

---

## Decision flow

After Step 0, read `~/.claude/settings.json` and check the `statusLine` field.

First, if the request is about **mode switching** (inline/box), go directly to "Action: Mode Switch" — skip the on/off detection entirely.

| State | Action |
|---|---|
| `statusLine.command` contains `status-line.mjs` | **Active** — disable (set `statusLine` to `null`) |
| `statusLine` missing or `null` | **Inactive** — enable (wire the command; files were synced in Step 0) |

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

Files were already copied in **Step 0**. Skip straight to wiring settings.json.

### 1. Wire settings.json

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

### 2. Verify

```bash
echo '{"rate_limits":{"five_hour":{"used_percentage":22,"resets_at":1776304800},"seven_day":{"used_percentage":3,"resets_at":1776834000}},"model":{"id":"claude-sonnet-4-6"},"cost":{"total_duration_ms":521000,"total_cost_usd":1.14},"context_window":{"used_percentage":13,"current_usage":{"input_tokens":1,"cache_read_input_tokens":20863,"cache_creation_input_tokens":6008}}}' \
  | node "$HOME/.claude/statusline/status-line.mjs"
```

The output must include rate-limit percentages with time-to-reset in parentheses (e.g. `(1h2m↓)`).
If the command errors with `ERR_MODULE_NOT_FOUND` or the output is empty, Step 0 didn't catch the drift — the plugin cache itself is broken or stale. Tell the user to reinstall/update the plugin.

Report: "Statusline enabled."

---

## Action: Disable

Set `statusLine` to `null` in `~/.claude/settings.json`.
Do NOT delete the files in `~/.claude/statusline/` -- they are reused on re-enable.
Do NOT touch any other fields in settings.json.

Report: "Statusline disabled."

---

## Action: Enable (re-enable)

Set `statusLine` back to the command object (same as bootstrap step 1).
Files were re-synced in **Step 0** — no need to re-copy manually.

Report: "Statusline enabled."

---

## Error conditions

| Condition | Action |
|---|---|
| Plugin cache not found on bootstrap | Plugin not installed. Tell user to install first |
| src/ directory missing in plugin | Plugin version too old. Tell user to update |
| settings.json parse error | Back up the file, then write minimal valid JSON |
| Verification output empty or `ERR_MODULE_NOT_FOUND` | Step 0 sync didn't fix it — the plugin cache is corrupt. Tell user to reinstall the plugin |
| `(↓)` missing from verify output | Installed plugin version is outdated. Update the plugin |

</Instructions>
</Skill_Guide>
