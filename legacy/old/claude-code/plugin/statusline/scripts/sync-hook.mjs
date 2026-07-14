#!/usr/bin/env node

/**
 * sync-hook.mjs
 *
 * SessionStart 훅 — claude-plugin/statusline/src/ 트리를 ~/.claude/statusline/
 * 위치로 미러링하여 status-line 명령이 안정적인 경로에서 해석되도록 한다.
 *
 * 새 모듈이 미래 플러그인 버전에 추가되어도 자동 반영되도록 src/ 전체를
 * 복사한다 — import 와 동기화해야 할 화이트리스트가 필요 없다.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import process from "node:process";

/**
 * `CLAUDE_PLUGIN_ROOT/src` 디렉터리를 `~/.claude/statusline/` 로 재귀
 * 복사한다. 환경 변수가 없거나 src 디렉터리가 없으면 조용히 종료한다.
 */
function main() {
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
  if (!pluginRoot) return;

  const src = path.join(pluginRoot, "src");
  if (!fs.existsSync(src)) return;

  const dst = path.join(os.homedir(), ".claude", "statusline");
  fs.cpSync(src, dst, { recursive: true, force: true });
}

main();
