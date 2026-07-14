import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const runner = path.resolve(testDir, "..", "benchmark-runner.mjs");

function run(args, cwd) {
  const result = spawnSync(process.execPath, [runner, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, CI: "1", FORCE_COLOR: "0" },
    timeout: 120_000,
  });
  assert.equal(
    result.status,
    0,
    `runner failed:\n${result.stdout ?? ""}\n${result.stderr ?? ""}`,
  );
  return result.stdout.trim() ? JSON.parse(result.stdout) : null;
}

async function write(filePath, content) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, content);
}

test("freezes dynamic target metadata and judges a solved isolated fixture", async (t) => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "evaluate-workbench-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const target = path.join(root, "renamed-flow");
  await write(
    path.join(target, ".codex-plugin", "plugin.json"),
    `${JSON.stringify({ name: "renamed-workbench", version: "3.2.1", skills: "./skills/" }, null, 2)}\n`,
  );
  await write(
    path.join(target, "skills", "goal-driver", "SKILL.md"),
    "---\nname: goal-driver\ndescription: Complete a selected goal.\n---\n\n# Goal Driver\n",
  );

  const initialized = run(
    [
      "init",
      "--target",
      `candidate=${target}`,
      "--repetitions",
      "1",
      "--output-root",
      path.join(root, "output"),
    ],
    root,
  );
  assert.equal(initialized.runs, 2);

  const manifest = JSON.parse(
    await fsp.readFile(path.join(initialized.sessionDir, "manifest.json"), "utf8"),
  );
  assert.equal(manifest.targets[0].pluginVersion, "3.2.1");
  assert.deepEqual(manifest.targets[0].skills.map((skill) => skill.name), ["goal-driver"]);
  assert.equal(manifest.targets[0].fileCount, 2);
  assert.deepEqual(
    manifest.targets[0].files.map((file) => file.path),
    [".codex-plugin/plugin.json", "skills/goal-driver/SKILL.md"],
  );

  const prepared = run(
    [
      "prepare",
      "--session",
      initialized.sessionDir,
      "--target",
      "candidate",
      "--benchmark",
      "profile-cache-dedupe",
      "--attempt",
      "1",
    ],
    root,
  );

  await write(
    path.join(prepared.workspace, "src", "profile-cache.js"),
    `export function createProfileCache({ fetchProfile, ttlMs = 60_000, now = Date.now }) {
  const cache = new Map();
  const inFlight = new Map();

  return {
    async get(userId) {
      const cached = cache.get(userId);
      if (cached && cached.expiresAt > now()) return cached.value;
      if (inFlight.has(userId)) return inFlight.get(userId);

      const request = (async () => {
        try {
          const value = await fetchProfile(userId);
          cache.set(userId, { value, expiresAt: now() + ttlMs });
          return value;
        } finally {
          inFlight.delete(userId);
        }
      })();
      inFlight.set(userId, request);
      return request;
    },

    clear(userId) {
      if (userId === undefined) cache.clear();
      else cache.delete(userId);
    },
  };
}
`,
  );

  run(["clock-start", "--run-dir", prepared.runDir], root);
  run(["clock-stop", "--run-dir", prepared.runDir], root);

  const responsePath = path.join(root, "response.md");
  await write(responsePath, "구현과 테스트를 완료했습니다.\n");
  run(
    [
      "record-turn",
      "--run-dir",
      prepared.runDir,
      "--input-file",
      prepared.input,
      "--output-file",
      responsePath,
      "--skill",
      `goal-driver@${path.join(target, "skills", "goal-driver", "SKILL.md")}`,
    ],
    root,
  );

  const judged = run(
    ["judge", "--run-dir", prepared.runDir, "--terminal-status", "completed"],
    root,
  );
  assert.equal(judged.status, "PASS");
  assert.equal(judged.checks.every((check) => check.ok), true);

  const summarized = run(["summarize", "--session", initialized.sessionDir], root);
  const summary = JSON.parse(await fsp.readFile(summarized.summary, "utf8"));
  assert.equal(summary.ranking[0].target, "candidate");
  assert.equal(summary.ranking[0].successRate, 0.5);
  assert.equal(await fsp.readFile(summarized.report, "utf8").then((value) => value.includes("1/1")), true);
  const conversation = await fsp.readFile(
    path.join(prepared.runDir, "skill-io", "conversation.md"),
    "utf8",
  );
  assert.match(conversation, /goal-driver/);
  assert.match(conversation, /구현과 테스트를 완료했습니다/);
});
