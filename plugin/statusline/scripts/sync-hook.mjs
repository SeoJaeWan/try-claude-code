#!/usr/bin/env node

/**
 * sync-hook.mjs
 *
 * SessionStart hook — mirrors plugin/statusline/src/ → ~/.claude/statusline/
 * so the status-line command always resolves from a stable path.
 *
 * Copies the entire src/ tree so new modules added in future plugin versions
 * are picked up automatically — no whitelist to keep in sync with imports.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import process from "node:process";

function main() {
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
  if (!pluginRoot) return;

  const src = path.join(pluginRoot, "src");
  if (!fs.existsSync(src)) return;

  const dst = path.join(os.homedir(), ".claude", "statusline");
  fs.cpSync(src, dst, { recursive: true, force: true });
}

main();
