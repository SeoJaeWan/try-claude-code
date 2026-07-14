---
name: statusline
description: "Toggle the inline status line on/off. Triggers on 'statusline', 'statusline on', 'statusline off', '상태줄', '상태줄 켜기', '상태줄 끄기'."
allowed-tools: Bash, Read, Write, Edit
---

<Skill_Guide>
<Purpose>
Single command to toggle the Claude Code status line. Detects whether it is currently wired to the inline renderer and flips the state.
</Purpose>

<Instructions>

# Statusline Management

## Step 0 — Always sync runtime files first (BEFORE any action)

**Run this on EVERY `/statusline` invocation**, regardless of whether the result will be enable or disable. It guarantees `~/.claude/statusline/` mirrors the installed plugin's `src/`, so files added in plugin updates are picked up automatically without manual intervention.

### Resolve plugin cache

```bash
CLAUDE_PLUGIN_ROOT=$(ls -d ~/.claude/plugins/cache/try-claude/try-claude-code-statusline/*/ 2>/dev/null | sort -V | tail -1 | sed 's:/$::')
```

If empty:
- For a first-run intent (no `~/.claude/statusline/status-line.mjs`), abort and tell the user to install the plugin.
- Otherwise, skip sync and continue with toggle logic.

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

> Rationale: re-running `/statusline` is the self-healing path — any missing or stale file in `~/.claude/statusline/` gets recovered from the plugin cache here.

---

## Decision flow

After Step 0, read `~/.claude/settings.json` and check the `statusLine` field. The skill is a pure toggle — there is only one renderer (inline).

| State | Action |
|---|---|
| `statusLine.command` contains `status-line.mjs` | **Active** — go to "Action: Disable" |
| `statusLine` missing or `null` | **Inactive** — go to "Action: Enable" |

> If the user explicitly says "on" or "off" ("켜기"/"끄기"), skip detection and force that action.

---

## Action: Enable

Set `statusLine` in `~/.claude/settings.json` to:

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

Report: "Statusline enabled. The status line will appear on the next message — if it doesn't render, re-run `/statusline` to re-sync, and if it still fails the plugin cache is corrupt and needs a reinstall."

What the inline status line shows:
> `model │ ⏱duration │ CTX:% ~$cost │ 5h:%(time↓) │ 7d:%(time↓) │ cache:% │ branch`

---

## Action: Disable

Set `statusLine` to `null` in `~/.claude/settings.json`.
Do NOT delete the files in `~/.claude/statusline/` -- they are reused on re-enable.
Do NOT touch any other fields in settings.json.

Report: "Statusline disabled."

---

## Error conditions

| Condition | Action |
|---|---|
| Plugin cache not found on enable | Plugin not installed. Tell user to install first |
| src/ directory missing in plugin | Plugin version too old. Tell user to update |
| settings.json parse error | Back up the file, then write minimal valid JSON |
| Status line doesn't appear after enable | Step 0 sync didn't catch the drift — the plugin cache is corrupt. Tell user to reinstall the plugin |

</Instructions>
</Skill_Guide>
