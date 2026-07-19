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

function runRaw(args, cwd) {
  // Invoke the local runner CLI; this does not create a Codex subagent.
  return spawnSync(process.execPath, [runner, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, CI: "1", FORCE_COLOR: "0" },
    timeout: 120_000,
  });
}

function run(args, cwd) {
  const result = runRaw(args, cwd);
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
      "--mode",
      "executor-only",
      "--repetitions",
      "1",
      "--output-root",
      path.join(root, "output"),
    ],
    root,
  );
  assert.equal(initialized.runs, 2);
  assert.equal(initialized.benchmarkMode, "executor-only");
  assert.equal(initialized.executionMode, "parallel-all");
  assert.equal(initialized.requestedConcurrency, 2);

  const manifest = JSON.parse(
    await fsp.readFile(path.join(initialized.sessionDir, "manifest.json"), "utf8"),
  );
  assert.equal(manifest.schemaVersion, 3);
  assert.equal(manifest.benchmarkMode, "executor-only");
  assert.equal(manifest.execution.mode, "parallel-all");
  assert.equal(manifest.execution.dispatchStrategy, "single-parallel-tool-batch");
  assert.equal(manifest.execution.turnCollectionStrategy, "parallel-wait-barrier");
  assert.equal(manifest.execution.clockStopStrategy, "per-agent-parallel-branch");
  assert.equal(manifest.execution.requestedConcurrency, 2);
  assert.equal(manifest.execution.speedMetric, "parallel-load-agent-latency-ms");
  assert.deepEqual(manifest.schedule.map((run) => run.dispatchIndex), [1, 2]);
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
  assert.equal(prepared.dispatchIndex, 1);

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

      const request = Promise.resolve()
        .then(() => fetchProfile(userId))
        .then((value) => {
          cache.set(userId, { value, expiresAt: now() + ttlMs });
          return value;
        })
        .finally(() => {
          inFlight.delete(userId);
        });
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
  const timedRun = JSON.parse(
    await fsp.readFile(path.join(prepared.runDir, "run.json"), "utf8"),
  );
  assert.equal(timedRun.schemaVersion, 3);
  assert.equal(timedRun.benchmarkMode, "executor-only");
  assert.equal(timedRun.executionMode, "parallel-all");
  assert.equal(timedRun.speedMetric, "parallel-load-agent-latency-ms");
  assert.equal(timedRun.dispatchIndex, 1);
  assert.equal(Number.isFinite(timedRun.firstActiveStartedAt), true);
  assert.equal(Number.isFinite(timedRun.lastActiveStoppedAt), true);
  assert.equal(timedRun.activeSegments.length, 1);

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
  assert.equal(judged.schemaVersion, 3);
  assert.equal(judged.benchmarkMode, "executor-only");
  assert.equal(judged.executionMode, "parallel-all");
  assert.equal(judged.speedMetric, "parallel-load-agent-latency-ms");
  assert.equal(judged.dispatchIndex, 1);
  assert.equal(judged.activeSegments.length, 1);
  assert.equal(judged.checks.every((check) => check.ok), true);

  const summarized = run(["summarize", "--session", initialized.sessionDir], root);
  const summary = JSON.parse(await fsp.readFile(summarized.summary, "utf8"));
  assert.equal(summary.schemaVersion, 3);
  assert.equal(summary.benchmarkMode, "executor-only");
  assert.equal(summary.execution.mode, "parallel-all");
  assert.equal(summary.execution.requestedConcurrency, 2);
  assert.equal(summary.execution.observedDispatch.startedRuns, 1);
  assert.equal(summary.execution.observedDispatch.skewMs, 0);
  assert.equal(summary.ranking[0].target, "candidate");
  assert.equal(summary.ranking[0].successRate, 1);
  assert.equal(summary.targets[0].scorable, 1);
  const report = await fsp.readFile(summarized.report, "utf8");
  assert.match(report, /1\/1/);
  assert.match(report, /parallel-load-agent-latency-ms/);
  const conversation = await fsp.readFile(
    path.join(prepared.runDir, "skill-io", "conversation.md"),
    "utf8",
  );
  assert.match(conversation, /goal-driver/);
  assert.match(conversation, /구현과 테스트를 완료했습니다/);
});

test("calibrates the profile Oracle against the unchanged negative fixture", async (t) => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "evaluate-workbench-oracle-negative-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const target = path.join(root, "candidate");
  await write(
    path.join(target, ".codex-plugin", "plugin.json"),
    `${JSON.stringify({ name: "candidate", version: "1.0.0", skills: "./skills/" }, null, 2)}\n`,
  );
  await write(
    path.join(target, "skills", "flow", "SKILL.md"),
    "---\nname: flow\ndescription: Execute a goal.\n---\n",
  );
  const initialized = run(
    [
      "init",
      "--target",
      `candidate=${target}`,
      "--mode",
      "executor-only",
      "--repetitions",
      "1",
      "--output-root",
      path.join(root, "output"),
    ],
    root,
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
  const judged = run(
    ["judge", "--run-dir", prepared.runDir, "--terminal-status", "completed"],
    root,
  );
  assert.equal(
    judged.status,
    "FAIL",
    `${JSON.stringify(judged, null, 2)}\n${await fsp.readFile(path.join(prepared.runDir, "oracle.log"), "utf8")}`,
  );
  assert.equal(judged.checks.find((check) => check.id === "public-tests").ok, true);
  assert.equal(judged.checks.find((check) => check.id === "hidden-behavior").ok, false);
});

test("drives a fixed full-loop dialogue and gates execution on the Goal Contract", async (t) => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "evaluate-workbench-full-loop-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const target = path.join(root, "candidate");
  await write(
    path.join(target, ".codex-plugin", "plugin.json"),
    `${JSON.stringify({ name: "candidate-workbench", version: "1.0.0", skills: "./skills/" }, null, 2)}\n`,
  );
  await write(
    path.join(target, "skills", "native-flow", "SKILL.md"),
    "---\nname: native-flow\ndescription: Clarify and execute goals.\n---\n",
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
  assert.equal(initialized.benchmarkMode, "full-loop");

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
  assert.equal(prepared.benchmarkMode, "full-loop");
  assert.match(await fsp.readFile(prepared.input, "utf8"), /아직 코드는 수정하지 마/);
  assert.equal(fs.existsSync(prepared.controllerState), true);
  assert.equal(fs.existsSync(prepared.controllerScenario), true);

  const answered = run(
    [
      "scenario-reply",
      "--run-dir",
      prepared.runDir,
      "--event",
      "failure-and-ttl:correct",
      "--event",
      "dedupe-scope:asked",
    ],
    root,
  );
  assert.equal(answered.action, "reply");
  assert.deepEqual(answered.missingDecisionIds, ["change-boundary"]);
  const answeredText = await fsp.readFile(answered.reply, "utf8");
  assert.match(answeredText, /같은 `userId`/);
  assert.equal(answeredText.indexOf("같은 `userId`"), 0);

  const objected = run(
    ["scenario-reply", "--run-dir", prepared.runDir, "--finalize-attempt", "true"],
    root,
  );
  assert.equal(objected.kind, "objection");
  assert.deepEqual(objected.missingDecisionIds, []);

  const contractRequest = run(
    ["scenario-reply", "--run-dir", prepared.runDir, "--finalize-attempt", "true"],
    root,
  );
  assert.equal(contractRequest.action, "request-contract");
  assert.match(await fsp.readFile(contractRequest.reply, "utf8"), /목표, 완료 조건/);

  const contractFile = path.join(root, "goal-contract.md");
  await write(
    contractFile,
    "# Goal Contract\n\n동일 사용자 요청 중복 제거, 실패 후 재시도와 TTL 보존, 공개 API와 의존성 경계 및 테스트를 완료 조건으로 한다.\n",
  );
  const contract = run(
    [
      "record-contract",
      "--run-dir",
      prepared.runDir,
      "--contract-file",
      contractFile,
      "--matched",
      "dedupe-scope",
      "--matched",
      "failure-and-ttl",
      "--matched",
      "change-boundary",
    ],
    root,
  );
  assert.equal(contract.status, "PASS");
  assert.match(await fsp.readFile(contract.executeInput, "utf8"), /방금 합의한 내용만 기준/);

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
  const executionResponse = path.join(root, "execution-response.md");
  await write(executionResponse, "합의한 Goal Contract 구현과 검증을 완료했습니다.\n");
  run(
    [
      "record-turn",
      "--run-dir",
      prepared.runDir,
      "--input-file",
      contract.executeInput,
      "--output-file",
      executionResponse,
      "--label",
      "executor-final",
      "--phase",
      "executor",
      "--kind",
      "execute",
    ],
    root,
  );
  const judged = run(
    ["judge", "--run-dir", prepared.runDir, "--terminal-status", "completed"],
    root,
  );
  assert.equal(judged.status, "PASS");
  assert.equal(judged.contract.status, "PASS");
  assert.equal(judged.interaction.dialogueTurns, 2);
  assert.equal(judged.interaction.objectionTurns, 1);

  const uiPrepared = run(
    [
      "prepare",
      "--session",
      initialized.sessionDir,
      "--target",
      "candidate",
      "--benchmark",
      "optimistic-favorite-ui",
      "--attempt",
      "1",
      "--skip-install",
      "true",
    ],
    root,
  );
  assert.match(await fsp.readFile(uiPrepared.input, "utf8"), /아직 코드는 수정하지 마/);
  run(
    [
      "scenario-reply",
      "--run-dir",
      uiPrepared.runDir,
      "--event",
      "optimistic-interaction:asked",
      "--event",
      "failure-isolation:asked",
      "--event",
      "accessibility-and-regression:asked",
    ],
    root,
  );
  run(
    ["scenario-reply", "--run-dir", uiPrepared.runDir, "--finalize-attempt", "true"],
    root,
  );
  const uncertainContract = path.join(root, "uncertain-contract.md");
  await write(uncertainContract, "합의 내용을 정리했지만 접근성 조건의 의미가 모호하다.\n");
  const invalidContract = run(
    [
      "record-contract",
      "--run-dir",
      uiPrepared.runDir,
      "--contract-file",
      uncertainContract,
      "--matched",
      "optimistic-interaction",
      "--matched",
      "failure-isolation",
      "--uncertain",
      "accessibility-and-regression semantic mapping",
    ],
    root,
  );
  assert.equal(invalidContract.status, "EVAL_INVALID");
  const invalidJudgment = run(
    ["judge", "--run-dir", uiPrepared.runDir, "--terminal-status", "completed"],
    root,
  );
  assert.equal(invalidJudgment.status, "EVAL_INVALID");
  assert.equal(invalidJudgment.checks.map((check) => check.id).join(","), "dependency-contract");

  const summarized = run(["summarize", "--session", initialized.sessionDir], root);
  const summary = JSON.parse(await fsp.readFile(summarized.summary, "utf8"));
  assert.equal(summary.benchmarkMode, "full-loop");
  assert.equal(summary.targets[0].passed, 1);
  assert.equal(summary.targets[0].scorable, 1);
  assert.equal(summary.targets[0].medianSuccessDialogueTurns, 2);
  assert.equal(summary.targets[0].benchmarks[1].evalInvalid, 1);
  assert.match(await fsp.readFile(summarized.report, "utf8"), /end-to-end success first/);
});

test("rejects a full-loop contract when the target edits before execution approval", async (t) => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "evaluate-workbench-premature-edit-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const target = path.join(root, "candidate");
  await write(
    path.join(target, ".codex-plugin", "plugin.json"),
    `${JSON.stringify({ name: "candidate", version: "1.0.0", skills: "./skills/" }, null, 2)}\n`,
  );
  await write(
    path.join(target, "skills", "flow", "SKILL.md"),
    "---\nname: flow\ndescription: Clarify and execute a goal.\n---\n",
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
  run(
    [
      "scenario-reply",
      "--run-dir",
      prepared.runDir,
      "--event",
      "dedupe-scope:asked",
      "--event",
      "failure-and-ttl:asked",
      "--event",
      "change-boundary:asked",
    ],
    root,
  );
  run(
    ["scenario-reply", "--run-dir", prepared.runDir, "--finalize-attempt", "true"],
    root,
  );
  await write(path.join(prepared.workspace, "premature.txt"), "implemented before approval\n");
  const contractFile = path.join(root, "contract.md");
  await write(contractFile, "모든 필수 결정을 포함한 Goal Contract\n");
  const contract = run(
    [
      "record-contract",
      "--run-dir",
      prepared.runDir,
      "--contract-file",
      contractFile,
      "--matched",
      "dedupe-scope",
      "--matched",
      "failure-and-ttl",
      "--matched",
      "change-boundary",
    ],
    root,
  );
  assert.equal(contract.status, "FAIL");
  assert.deepEqual(contract.prematureWorkspaceChanges, ["?? premature.txt"]);
  assert.equal(contract.executeInput, null);

  const judged = run(
    ["judge", "--run-dir", prepared.runDir, "--terminal-status", "completed"],
    root,
  );
  assert.equal(judged.status, "FAIL");
  assert.equal(judged.terminalStatus, "CONTRACT_FAIL");
});

test("requests all twenty standard comparison runs in one parallel batch", async (t) => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "evaluate-workbench-parallel-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const targets = [];
  for (const label of ["current", "v1"]) {
    const target = path.join(root, label);
    await write(
      path.join(target, ".codex-plugin", "plugin.json"),
      `${JSON.stringify({ name: `${label}-workbench`, version: "1.0.0", skills: "./skills/" }, null, 2)}\n`,
    );
    await write(
      path.join(target, "skills", "flow", "SKILL.md"),
      `---\nname: ${label}-flow\ndescription: Complete a selected goal.\n---\n`,
    );
    targets.push(`${label}=${target}`);
  }

  const initialized = run(
    [
      "init",
      "--target",
      targets[0],
      "--target",
      targets[1],
      "--repetitions",
      "5",
      "--output-root",
      path.join(root, "output"),
    ],
    root,
  );
  const manifest = JSON.parse(
    await fsp.readFile(path.join(initialized.sessionDir, "manifest.json"), "utf8"),
  );

  assert.equal(initialized.runs, 20);
  assert.equal(initialized.benchmarkMode, "full-loop");
  assert.equal(initialized.requestedConcurrency, 20);
  assert.equal(manifest.execution.dispatchStrategy, "single-parallel-tool-batch");
  assert.equal(manifest.schedule.length, 20);
  assert.deepEqual(
    manifest.schedule.map((scheduled) => scheduled.dispatchIndex),
    Array.from({ length: 20 }, (_, index) => index + 1),
  );
  for (const target of ["current", "v1"]) {
    for (const benchmark of manifest.benchmarks) {
      assert.equal(
        manifest.schedule.filter(
          (scheduled) => scheduled.target === target && scheduled.benchmark === benchmark,
        ).length,
        5,
      );
    }
  }
});

test("aborts and refuses to summarize a partially launched parallel batch", async (t) => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "evaluate-workbench-abort-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const target = path.join(root, "candidate");
  await write(
    path.join(target, ".codex-plugin", "plugin.json"),
    `${JSON.stringify({ name: "candidate-workbench", version: "1.0.0", skills: "./skills/" }, null, 2)}\n`,
  );
  await write(
    path.join(target, "skills", "flow", "SKILL.md"),
    "---\nname: flow\ndescription: Complete a selected goal.\n---\n",
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
  run(["clock-start", "--run-dir", prepared.runDir], root);

  const aborted = run(
    ["abort", "--session", initialized.sessionDir, "--reason", "concurrency-limit"],
    root,
  );
  assert.equal(aborted.reason, "concurrency-limit");
  assert.equal(aborted.abortedRuns, 1);

  const runState = JSON.parse(
    await fsp.readFile(path.join(prepared.runDir, "run.json"), "utf8"),
  );
  assert.equal(runState.status, "aborted");
  assert.equal(runState.terminalStatus, "ABORTED");
  assert.equal(runState.activeTurnStartedAt, null);
  assert.equal(runState.activeSegments.length, 1);
  assert.equal(fs.existsSync(path.join(initialized.sessionDir, "aborted.json")), true);

  const summarized = runRaw(["summarize", "--session", initialized.sessionDir], root);
  assert.notEqual(summarized.status, 0);
  assert.match(summarized.stderr, /Cannot summarize an aborted benchmark session/);
});
