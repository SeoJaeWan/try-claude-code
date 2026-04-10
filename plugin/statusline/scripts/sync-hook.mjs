#!/usr/bin/env node

/**
 * sync-hook.mjs
 *
 * SessionStart hook — copies plugin/statusline/src/ → ~/.claude/statusline/
 * so the status-line command always resolves from a stable path.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import process from "node:process";

const STATUSLINE_FILES = [
  "status-line.mjs",
  "gmail-collect.mjs",
  "lib/box-renderer.mjs",
  "lib/gmail-collector.mjs",
  "lib/status-cache.mjs",
];

function main() {
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
  if (!pluginRoot) return;

  const src = path.join(pluginRoot, "src");
  if (!fs.existsSync(src)) return;

  const dst = path.join(os.homedir(), ".claude", "statusline");
  fs.mkdirSync(path.join(dst, "lib"), { recursive: true });

  for (const file of STATUSLINE_FILES) {
    const srcFile = path.join(src, file);
    const dstFile = path.join(dst, file);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, dstFile);
    }
  }
}

main();
