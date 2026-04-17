// Best-effort hook telemetry. Writes one JSONL event per matched hook call
// under $CLAUDE_PLUGIN_DATA/metrics.jsonl. Failures are silent — telemetry
// must never block or alter hook behavior.

import fs from "node:fs";
import path from "node:path";

const PLUGIN_DATA_ENV = "CLAUDE_PLUGIN_DATA";

function resolveMetricsFile() {
  const dir = process.env[PLUGIN_DATA_ENV];
  if (!dir) return null;
  return path.join(dir, "metrics.jsonl");
}

// Record a single hook event. `event` must be JSON-serializable and should
// contain at minimum a `kind` field (e.g. "phase_desc", "worktree_add") and
// an `ok` boolean. Extra fields are preserved.
export function recordHookEvent(event) {
  const file = resolveMetricsFile();
  if (!file) return;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(
      file,
      JSON.stringify({ at: new Date().toISOString(), ...event }) + "\n",
      "utf8"
    );
  } catch {
    // best-effort — drop the event rather than crash a hook.
  }
}
