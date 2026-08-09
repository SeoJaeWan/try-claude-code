import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(testDirectory, "../../../..");

test("Workbench discovers session refresh and Bash capture hooks from the default hook path", () => {
  const hookConfig = JSON.parse(
    fs.readFileSync(path.join(pluginRoot, "hooks", "hooks.json"), "utf8")
  );
  const sessionHandlers = hookConfig.hooks?.SessionStart;
  const handlers = hookConfig.hooks?.PostToolUse;

  assert.equal(Array.isArray(sessionHandlers), true);
  assert.equal(sessionHandlers.length, 1);
  assert.equal(sessionHandlers[0].matcher, "^(startup|resume)$");
  assert.deepEqual(sessionHandlers[0].hooks, [
    {
      type: "command",
      command: "node \"${PLUGIN_ROOT}/hooks/session-start-sync.mjs\"",
      commandWindows: "node \"%PLUGIN_ROOT%\\hooks\\session-start-sync.mjs\"",
      timeout: 45
    }
  ]);

  assert.equal(Array.isArray(handlers), true);
  assert.equal(handlers.length, 1);
  assert.equal(handlers[0].matcher, "^Bash$");
  assert.deepEqual(handlers[0].hooks, [
    {
      type: "command",
      command: "node \"${PLUGIN_ROOT}/skills/llm-script/scripts/capture-script-source.mjs\"",
      commandWindows: "node \"%PLUGIN_ROOT%\\skills\\llm-script\\scripts\\capture-script-source.mjs\"",
      timeout: 10
    }
  ]);

  const manifest = JSON.parse(
    fs.readFileSync(path.join(pluginRoot, ".codex-plugin", "plugin.json"), "utf8")
  );
  assert.equal(Object.hasOwn(manifest, "hooks"), false);
  assert.equal(manifest.interface.defaultPrompt.length <= 3, true);
});
