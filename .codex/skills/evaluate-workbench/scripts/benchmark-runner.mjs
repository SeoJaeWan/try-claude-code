#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(scriptDir, "..");
const benchmarkRoot = path.join(skillRoot, "assets", "benchmarks");
const benchmarkIds = ["profile-cache-dedupe", "optimistic-favorite-ui"];
const benchmarkModes = ["full-loop", "executor-only"];

function usage() {
  return `Usage:
  benchmark-runner.mjs init --target <id=plugin-root> [--target ...] [--mode full-loop|executor-only] [--repetitions 5] [--output-root output/evaluate]
  benchmark-runner.mjs prepare --session <dir> --target <id> --benchmark <id> --attempt <n> [--skip-install true]
  benchmark-runner.mjs clock-start --run-dir <dir>
  benchmark-runner.mjs clock-stop --run-dir <dir>
  benchmark-runner.mjs record-turn --run-dir <dir> --input-file <file> --output-file <file> [--label agent-session] [--phase brainstorm|contract|executor] [--kind initial|answer|objection|confirmation|policy|contract|execute] [--decision <id> ...] [--skill <name@path> ...]
  benchmark-runner.mjs scenario-reply --run-dir <dir> [--event <decision-id>:asked|correct|incorrect ... | --event policy:discretionary|scope-expansion|unknown | --finalize-attempt true]
  benchmark-runner.mjs record-contract --run-dir <dir> --contract-file <file> [--matched <decision-id> ...] [--contradiction <decision-id> ...] [--invented <label> ...] [--uncertain <label> ...]
  benchmark-runner.mjs judge --run-dir <dir> [--terminal-status completed|NEEDS_INPUT|DIALOGUE_LIMIT|CONTRACT_FAIL|TARGET_ERROR|EVAL_INVALID|INFRA_ERROR]
  benchmark-runner.mjs abort --session <dir> [--reason concurrency-limit]
  benchmark-runner.mjs summarize --session <dir>`;
}

function parseOptions(argv) {
  const values = new Map();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const equalsIndex = token.indexOf("=");
    const key = equalsIndex === -1 ? token.slice(2) : token.slice(2, equalsIndex);
    let value = equalsIndex === -1 ? undefined : token.slice(equalsIndex + 1);

    if (value === undefined) {
      const next = argv[index + 1];
      if (next === undefined || next.startsWith("--")) {
        value = "true";
      } else {
        value = next;
        index += 1;
      }
    }

    const current = values.get(key) ?? [];
    current.push(value);
    values.set(key, current);
  }

  return {
    all(key) {
      return values.get(key) ?? [];
    },
    one(key, fallback = undefined) {
      const found = values.get(key);
      return found?.at(-1) ?? fallback;
    },
    bool(key) {
      return ["true", "1", "yes"].includes(String(this.one(key, "false")).toLowerCase());
    },
  };
}

function assertSafeSegment(value, label) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)) {
    throw new Error(`${label} must use letters, digits, dot, underscore, or hyphen: ${value}`);
  }
  return value;
}

function positiveInteger(value, label) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer: ${value}`);
  }
  return parsed;
}

function oneOf(value, allowed, label) {
  if (!allowed.includes(value)) {
    throw new Error(`${label} must be one of ${allowed.join(", ")}: ${value}`);
  }
  return value;
}

async function readJson(filePath) {
  return JSON.parse(await fsp.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function fileExists(filePath) {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walkFiles(root, predicate = () => true) {
  if (!(await fileExists(root))) {
    return [];
  }

  const found = [];
  async function visit(current) {
    const entries = await fsp.readdir(current, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      if ([".git", "node_modules", "coverage"].includes(entry.name)) {
        continue;
      }
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(absolute);
      } else if (entry.isFile() && predicate(absolute)) {
        found.push(absolute);
      }
    }
  }
  await visit(root);
  return found;
}

function parseSkillName(content, fallback) {
  const frontmatter = content.match(/^---\s*\n([\s\S]*?)\n---/);
  const name = frontmatter?.[1].match(/^name:\s*["']?([^"'\n]+)["']?\s*$/m)?.[1]?.trim();
  return name || fallback;
}

async function describeTarget(raw) {
  const equalsIndex = raw.indexOf("=");
  if (equalsIndex < 1) {
    throw new Error(`Target must use id=plugin-root: ${raw}`);
  }

  const id = assertSafeSegment(raw.slice(0, equalsIndex), "target id");
  const root = path.resolve(raw.slice(equalsIndex + 1));
  const stat = await fsp.stat(root).catch(() => null);
  if (!stat?.isDirectory()) {
    throw new Error(`Target root is not a directory: ${root}`);
  }

  const manifestPath = path.join(root, ".codex-plugin", "plugin.json");
  const manifest = (await fileExists(manifestPath)) ? await readJson(manifestPath) : null;
  const candidateFiles = await walkFiles(root);

  const files = [];
  const skills = [];
  for (const filePath of candidateFiles) {
    const content = await fsp.readFile(filePath);
    const relative = path.relative(root, filePath);
    const digest = sha256(content);
    files.push({ path: relative, sha256: digest });
    if (relative.endsWith("/SKILL.md")) {
      skills.push({
        name: parseSkillName(content.toString("utf8"), path.basename(path.dirname(filePath))),
        path: relative,
        sha256: digest,
      });
    }
  }

  return {
    id,
    root,
    pluginName: manifest?.name ?? null,
    pluginVersion: manifest?.version ?? null,
    digest: sha256(stableJson(files)),
    fileCount: files.length,
    files,
    skills,
  };
}

function utcRunId(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    "-",
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
    "Z",
  ].join("");
}

async function uniqueDirectory(root, preferredName) {
  for (let index = 0; index < 1000; index += 1) {
    const suffix = index === 0 ? "" : `-${String(index).padStart(2, "0")}`;
    const candidate = path.join(root, `${preferredName}${suffix}`);
    try {
      await fsp.mkdir(candidate, { recursive: false });
      return candidate;
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw error;
      }
    }
  }
  throw new Error(`Could not allocate a session directory under ${root}`);
}

async function loadDefinition(id) {
  if (!benchmarkIds.includes(id)) {
    throw new Error(`Unknown benchmark: ${id}`);
  }
  return readJson(path.join(benchmarkRoot, id, "benchmark.json"));
}

async function loadScenario(definition) {
  if (!definition.interactiveScenario) {
    throw new Error(`Benchmark ${definition.id} does not define an interactive scenario`);
  }
  const scenarioPath = path.join(benchmarkRoot, definition.id, definition.interactiveScenario);
  const scenario = await readJson(scenarioPath);
  if (scenario.schemaVersion !== 1) {
    throw new Error(`Unsupported scenario schema for ${definition.id}: ${scenario.schemaVersion}`);
  }
  if (!scenario.initialPrompt || !scenario.contractPrompt || !scenario.executePrompt) {
    throw new Error(`Scenario ${definition.id} must define initialPrompt, contractPrompt, and executePrompt`);
  }
  positiveInteger(String(scenario.turnBudget), `scenario ${definition.id} turnBudget`);
  if (!Array.isArray(scenario.requiredDecisions) || scenario.requiredDecisions.length === 0) {
    throw new Error(`Scenario ${definition.id} must define requiredDecisions`);
  }
  const seen = new Set();
  for (const decision of scenario.requiredDecisions) {
    assertSafeSegment(decision.id, `scenario ${definition.id} decision id`);
    if (seen.has(decision.id)) {
      throw new Error(`Scenario ${definition.id} has duplicate decision id: ${decision.id}`);
    }
    seen.add(decision.id);
    for (const key of ["asked", "correctProposal", "incorrectProposal", "missingAtFinalize"]) {
      if (!decision.responses?.[key]) {
        throw new Error(`Scenario ${definition.id} decision ${decision.id} is missing response ${key}`);
      }
    }
  }
  return { scenario, scenarioPath };
}

function controllerRoot(runDir) {
  return path.join(runDir, "controller");
}

function controllerStatePath(runDir) {
  return path.join(controllerRoot(runDir), "state.json");
}

function contractResultPath(runDir) {
  return path.join(runDir, "contract-result.json");
}

async function readControllerState(runDir) {
  const statePath = controllerStatePath(runDir);
  if (!(await fileExists(statePath))) {
    throw new Error(`Interactive controller state is missing: ${statePath}`);
  }
  return readJson(statePath);
}

function interactionSummary(state) {
  if (!state) return null;
  return {
    dialogueTurns: state.dialogueTurns ?? 0,
    answerTurns: state.answerTurns ?? 0,
    confirmationTurns: state.confirmationTurns ?? 0,
    objectionTurns: state.objectionTurns ?? 0,
    policyTurns: state.policyTurns ?? 0,
    repeatedDecisionEvents: state.events?.filter((event) => event.repeated === true).length ?? 0,
    confirmedDecisions: state.confirmedDecisionIds?.length ?? 0,
    requiredDecisions: state.requiredDecisionIds?.length ?? 0,
    phase: state.phase ?? null,
  };
}

// This executes local OS commands only. The parent Codex conversation owns all
// spawn_agent/wait_agent/send_input/close_agent calls described in SKILL.md.
function runProcess(command, cwd, timeoutMs = 600_000) {
  const startedAt = Date.now();
  const childEnv = { ...process.env, CI: "1", FORCE_COLOR: "0" };
  // The runner itself is exercised by node:test. Do not let its nested public
  // and Oracle checks inherit Node's recursive-test marker and silently skip.
  delete childEnv.NODE_TEST_CONTEXT;
  const result = spawnSync(command[0], command.slice(1), {
    cwd,
    encoding: "utf8",
    env: childEnv,
    timeout: timeoutMs,
    maxBuffer: 20 * 1024 * 1024,
  });
  return {
    command,
    ok: result.status === 0 && !result.error,
    exitCode: result.status,
    signal: result.signal,
    durationMs: Date.now() - startedAt,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error ? String(result.error.message ?? result.error) : null,
  };
}

function processLog(check) {
  const lines = [
    `## ${check.id}`,
    `command: ${check.command.join(" ")}`,
    `status: ${check.ok ? "PASS" : "FAIL"}`,
    `durationMs: ${check.durationMs}`,
    "",
    "### stdout",
    check.stdout || "(empty)",
    "",
    "### stderr",
    check.stderr || "(empty)",
    "",
  ];
  if (check.error) {
    lines.push("### error", check.error, "");
  }
  return lines.join("\n");
}

async function dependencySnapshot(workspace) {
  const packagePath = path.join(workspace, "package.json");
  if (!(await fileExists(packagePath))) {
    return null;
  }
  const packageJson = await readJson(packagePath);
  const sections = {};
  for (const key of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
    sections[key] = packageJson[key] ?? {};
  }
  const lockPath = path.join(workspace, "package-lock.json");
  return {
    sections,
    lockPresent: await fileExists(lockPath),
    lockHash: (await fileExists(lockPath)) ? sha256(await fsp.readFile(lockPath)) : null,
  };
}

async function updateRun(runDir, updater) {
  const runPath = path.join(runDir, "run.json");
  const run = await readJson(runPath);
  const updated = await updater(run);
  await writeJson(runPath, updated ?? run);
  return updated ?? run;
}

function finishActiveTurn(run, stoppedAt = Date.now()) {
  if (run.activeTurnStartedAt == null) return 0;
  const startedAt = run.activeTurnStartedAt;
  const durationMs = Math.max(0, stoppedAt - startedAt);
  run.activeDurationMs = (run.activeDurationMs ?? 0) + durationMs;
  run.activeSegments = run.activeSegments ?? [];
  run.activeSegments.push({ startedAt, stoppedAt, durationMs });
  run.activeTurnStartedAt = null;
  run.lastActiveStoppedAt = stoppedAt;
  return durationMs;
}

async function commandInit(options) {
  const targetArgs = options.all("target");
  if (targetArgs.length === 0) {
    throw new Error("At least one --target id=plugin-root is required");
  }
  const benchmarkMode = oneOf(options.one("mode", "full-loop"), benchmarkModes, "mode");
  const repetitions = positiveInteger(options.one("repetitions", "5"), "repetitions");
  const outputRoot = path.resolve(options.one("output-root", path.join(process.cwd(), "output", "evaluate")));
  await fsp.mkdir(outputRoot, { recursive: true });
  const sessionDir = await uniqueDirectory(outputRoot, utcRunId());
  const targets = [];
  const seen = new Set();
  for (const raw of targetArgs) {
    const target = await describeTarget(raw);
    if (seen.has(target.id)) {
      throw new Error(`Duplicate target id: ${target.id}`);
    }
    seen.add(target.id);
    targets.push(target);
  }

  const schedule = [];
  for (let attempt = 1; attempt <= repetitions; attempt += 1) {
    const benchmarkOrder = attempt % 2 === 1 ? benchmarkIds : [...benchmarkIds].reverse();
    const targetOrder = attempt % 2 === 1 ? targets : [...targets].reverse();
    for (const benchmark of benchmarkOrder) {
      for (const target of targetOrder) {
        schedule.push({
          dispatchIndex: schedule.length + 1,
          target: target.id,
          benchmark,
          attempt,
        });
      }
    }
  }

  const manifest = {
    schemaVersion: 3,
    createdAt: new Date().toISOString(),
    sessionDir,
    benchmarkMode,
    repetitions,
    benchmarks: benchmarkIds,
    targets,
    schedule,
    execution: {
      mode: "parallel-all",
      dispatchStrategy: "single-parallel-tool-batch",
      turnCollectionStrategy: "parallel-wait-barrier",
      clockStopStrategy: "per-agent-parallel-branch",
      requestedConcurrency: schedule.length,
      prepareAllBeforeDispatch: true,
      oracleAfterAllClocksStop: true,
      speedMetric: "parallel-load-agent-latency-ms",
      spawnFailurePolicy: "abort-session",
      defaultTargetTimeoutMs: 600_000,
    },
    scoring: {
      primary: benchmarkMode === "full-loop" ? "end-to-end-success-rate" : "artifact-success-rate",
      tieBreakers: benchmarkMode === "full-loop"
        ? ["median-success-dialogue-turns", "median-success-parallel-load-latency-ms"]
        : ["median-success-parallel-load-latency-ms"],
      processTraceAffectsScore: false,
    },
  };
  await writeJson(path.join(sessionDir, "manifest.json"), manifest);
  process.stdout.write(
    `${JSON.stringify({
      sessionDir,
      runs: schedule.length,
      benchmarkMode,
      executionMode: manifest.execution.mode,
      requestedConcurrency: manifest.execution.requestedConcurrency,
    }, null, 2)}\n`,
  );
}

async function commandPrepare(options) {
  const sessionDir = path.resolve(options.one("session"));
  const targetId = assertSafeSegment(options.one("target"), "target id");
  const benchmarkId = assertSafeSegment(options.one("benchmark"), "benchmark id");
  const attempt = positiveInteger(options.one("attempt"), "attempt");
  const manifest = await readJson(path.join(sessionDir, "manifest.json"));
  const target = manifest.targets.find((item) => item.id === targetId);
  if (!target) {
    throw new Error(`Target not found in session manifest: ${targetId}`);
  }
  if (!manifest.benchmarks.includes(benchmarkId)) {
    throw new Error(`Benchmark not found in session manifest: ${benchmarkId}`);
  }
  if (attempt > manifest.repetitions) {
    throw new Error(`Attempt ${attempt} exceeds repetitions ${manifest.repetitions}`);
  }
  const scheduleIndex = manifest.schedule.findIndex(
    (item) => item.target === targetId && item.benchmark === benchmarkId && item.attempt === attempt,
  );
  if (scheduleIndex === -1) {
    throw new Error(`Run is not present in the session schedule: ${targetId}/${benchmarkId}/${attempt}`);
  }
  const scheduledRun = manifest.schedule[scheduleIndex];
  const currentTarget = await describeTarget(`${target.id}=${target.root}`);
  if (currentTarget.digest !== target.digest) {
    throw new Error(
      `Target ${target.id} changed after session initialization; start a new evaluation session`,
    );
  }
  const { files: _targetFiles, ...runTarget } = target;

  const definition = await loadDefinition(benchmarkId);
  const runDir = path.join(
    sessionDir,
    targetId,
    benchmarkId,
    `run-${String(attempt).padStart(3, "0")}`,
  );
  if (await fileExists(runDir)) {
    throw new Error(`Run directory already exists: ${runDir}`);
  }
  const workspace = path.join(runDir, "workspace");
  await fsp.mkdir(runDir, { recursive: true });
  await fsp.cp(path.join(benchmarkRoot, benchmarkId, definition.fixture), workspace, { recursive: true });
  const benchmarkMode = manifest.benchmarkMode ?? "executor-only";
  let scenario = null;
  let scenarioPath = null;
  if (benchmarkMode === "full-loop") {
    ({ scenario, scenarioPath } = await loadScenario(definition));
    await fsp.copyFile(
      path.join(benchmarkRoot, benchmarkId, scenario.initialPrompt),
      path.join(runDir, "input.md"),
    );
    await writeJson(controllerStatePath(runDir), {
      schemaVersion: 1,
      benchmark: benchmarkId,
      phase: "brainstorm",
      turnBudget: scenario.turnBudget,
      dialogueTurns: 0,
      answerTurns: 0,
      confirmationTurns: 0,
      objectionTurns: 0,
      policyTurns: 0,
      requiredDecisionIds: scenario.requiredDecisions.map((decision) => decision.id),
      confirmedDecisionIds: [],
      events: [],
      replies: [],
      createdAt: new Date().toISOString(),
    });
  } else {
    await fsp.copyFile(path.join(benchmarkRoot, benchmarkId, definition.prompt), path.join(runDir, "input.md"));
  }

  const setupChecks = [];
  if (definition.setupCommand && !options.bool("skip-install")) {
    const result = runProcess(definition.setupCommand, workspace, definition.setupTimeoutMs ?? 600_000);
    setupChecks.push({ id: "dependency-setup", ...result });
    await fsp.writeFile(path.join(runDir, "setup.log"), processLog(setupChecks[0]));
    if (!result.ok) {
      throw new Error(`Dependency setup failed for ${benchmarkId}; see ${path.join(runDir, "setup.log")}`);
    }
  }

  for (const command of [
    ["git", "init", "-q"],
    ["git", "add", "-A"],
    [
      "git",
      "-c",
      "user.name=Evaluate Workbench",
      "-c",
      "user.email=evaluate-workbench@local.invalid",
      "commit",
      "-qm",
      "baseline",
    ],
  ]) {
    const result = runProcess(command, workspace, 60_000);
    if (!result.ok) {
      throw new Error(`Failed to create fixture baseline: ${command.join(" ")}\n${result.stderr}`);
    }
  }
  const baseline = runProcess(["git", "rev-parse", "HEAD"], workspace, 60_000).stdout.trim();
  const dependencies = await dependencySnapshot(workspace);
  await writeJson(path.join(runDir, "initial-dependencies.json"), dependencies);
  await writeJson(path.join(runDir, "run.json"), {
    schemaVersion: 3,
    status: "prepared",
    terminalStatus: null,
    target: runTarget,
    benchmark: { id: definition.id, title: definition.title },
    benchmarkMode,
    attempt,
    runDir,
    workspace,
    baseline,
    setupChecks,
    executionMode: manifest.execution?.mode ?? "sequential",
    speedMetric: manifest.execution?.speedMetric ?? "target-active-duration-ms",
    dispatchIndex: scheduledRun.dispatchIndex ?? scheduleIndex + 1,
    activeDurationMs: 0,
    activeTurnStartedAt: null,
    activeSegments: [],
    firstActiveStartedAt: null,
    lastActiveStoppedAt: null,
    preparedAt: new Date().toISOString(),
  });

  process.stdout.write(
    `${JSON.stringify({
      runDir,
      workspace,
      input: path.join(runDir, "input.md"),
      benchmarkMode,
      controllerState: benchmarkMode === "full-loop" ? controllerStatePath(runDir) : null,
      controllerScenario: benchmarkMode === "full-loop" ? scenarioPath : null,
      target: runTarget,
      dispatchIndex: scheduledRun.dispatchIndex ?? scheduleIndex + 1,
    }, null, 2)}\n`,
  );
}

async function commandClockStart(options) {
  const runDir = path.resolve(options.one("run-dir"));
  const run = await updateRun(runDir, (current) => {
    if (current.activeTurnStartedAt != null) {
      throw new Error(`A target turn is already active for ${runDir}`);
    }
    const startedAt = Date.now();
    current.activeTurnStartedAt = startedAt;
    current.firstActiveStartedAt = current.firstActiveStartedAt ?? startedAt;
    current.status = "running";
    return current;
  });
  process.stdout.write(`${JSON.stringify({ activeTurnStartedAt: run.activeTurnStartedAt })}\n`);
}

async function commandClockStop(options) {
  const runDir = path.resolve(options.one("run-dir"));
  const run = await updateRun(runDir, (current) => {
    if (current.activeTurnStartedAt == null) {
      throw new Error(`No target turn is active for ${runDir}`);
    }
    finishActiveTurn(current);
    return current;
  });
  process.stdout.write(`${JSON.stringify({ activeDurationMs: run.activeDurationMs })}\n`);
}

async function commandAbort(options) {
  const sessionDir = path.resolve(options.one("session"));
  const reason = options.one("reason", "aborted");
  const manifest = await readJson(path.join(sessionDir, "manifest.json"));
  const abortedAt = new Date().toISOString();
  let abortedRuns = 0;

  for (const scheduled of manifest.schedule) {
    const runDir = path.join(
      sessionDir,
      scheduled.target,
      scheduled.benchmark,
      `run-${String(scheduled.attempt).padStart(3, "0")}`,
    );
    if (!(await fileExists(path.join(runDir, "run.json")))) continue;
    await updateRun(runDir, (current) => {
      finishActiveTurn(current);
      if (!["judged", "aborted"].includes(current.status)) {
        current.status = "aborted";
        current.terminalStatus = "ABORTED";
        current.abortedAt = abortedAt;
        current.abortReason = reason;
        abortedRuns += 1;
      }
      return current;
    });
  }

  const aborted = {
    schemaVersion: 1,
    abortedAt,
    reason,
    abortedRuns,
    note: "This session is invalid for comparison and must not be summarized as a completed benchmark.",
  };
  await writeJson(path.join(sessionDir, "aborted.json"), aborted);
  process.stdout.write(`${JSON.stringify(aborted, null, 2)}\n`);
}

async function commandRecordTurn(options) {
  const runDir = path.resolve(options.one("run-dir"));
  const inputFile = path.resolve(options.one("input-file"));
  const outputFile = path.resolve(options.one("output-file"));
  const label = assertSafeSegment(options.one("label", "agent-session"), "turn label");
  const phase = options.one("phase", null);
  const kind = options.one("kind", null);
  if (phase !== null) oneOf(phase, ["brainstorm", "contract", "executor"], "turn phase");
  if (kind !== null) {
    oneOf(
      kind,
      ["initial", "answer", "objection", "confirmation", "policy", "contract", "execute"],
      "turn kind",
    );
  }
  const decisions = options.all("decision").map((id) => assertSafeSegment(id, "decision id"));
  const run = await readJson(path.join(runDir, "run.json"));
  let executionState = null;
  if (phase === "executor" && kind === "execute" && run.benchmarkMode === "full-loop") {
    executionState = await readControllerState(runDir);
    if (executionState.phase !== "ready-to-execute") {
      throw new Error(`Final execution turn cannot be recorded in controller phase ${executionState.phase}`);
    }
  }
  const skills = options.all("skill").map((raw) => {
    const at = raw.indexOf("@");
    return at === -1 ? { name: raw, path: null } : { name: raw.slice(0, at), path: raw.slice(at + 1) };
  });
  const root = path.join(runDir, "skill-io");
  await fsp.mkdir(root, { recursive: true });
  const existing = (await fsp.readdir(root, { withFileTypes: true })).filter((entry) => entry.isDirectory());
  const sequence = existing.length + 1;
  const turnDir = path.join(root, `${String(sequence).padStart(3, "0")}-${label}`);
  await fsp.mkdir(turnDir, { recursive: false });
  await fsp.copyFile(inputFile, path.join(turnDir, "input.md"));
  await fsp.copyFile(outputFile, path.join(turnDir, "output.md"));
  await writeJson(path.join(turnDir, "meta.json"), {
    sequence,
    label,
    phase,
    kind,
    decisions,
    skills,
    recordedAt: new Date().toISOString(),
    note: "Only observable input/output is recorded; hidden reasoning is not captured.",
  });

  const turnDirs = (await fsp.readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const conversation = ["# Observable Skill I/O", ""];
  const events = [];
  for (const name of turnDirs) {
    const currentDir = path.join(root, name);
    const meta = await readJson(path.join(currentDir, "meta.json"));
    const input = await fsp.readFile(path.join(currentDir, "input.md"), "utf8");
    const output = await fsp.readFile(path.join(currentDir, "output.md"), "utf8");
    const skillLabel = meta.skills.length > 0 ? meta.skills.map((item) => item.name).join(", ") : "not observed";
    const interactionLabel = [meta.phase, meta.kind].filter(Boolean).join(" / ") || "not classified";
    conversation.push(
      `## Turn ${meta.sequence} — ${meta.label}`,
      "",
      `- Skills: ${skillLabel}`,
      `- Interaction: ${interactionLabel}`,
      `- Decisions: ${meta.decisions?.join(", ") || "none"}`,
      "",
      "### Input",
      "",
      input.trimEnd(),
      "",
      "### Output",
      "",
      output.trimEnd(),
      "",
    );
    events.push(
      JSON.stringify({ turn: meta.sequence, role: "user", label: meta.label, phase: meta.phase, kind: meta.kind, decisions: meta.decisions, skills: meta.skills, content: input }),
      JSON.stringify({ turn: meta.sequence, role: "assistant", label: meta.label, phase: meta.phase, kind: meta.kind, decisions: meta.decisions, skills: meta.skills, content: output }),
    );
  }
  await fsp.writeFile(path.join(root, "conversation.md"), `${conversation.join("\n").trimEnd()}\n`);
  await fsp.writeFile(path.join(root, "events.jsonl"), `${events.join("\n")}\n`);
  if (executionState) {
    executionState.phase = "execution-completed";
    executionState.executionTurnSequence = sequence;
    executionState.updatedAt = new Date().toISOString();
    await writeJson(controllerStatePath(runDir), executionState);
  }
  process.stdout.write(`${JSON.stringify({ turnDir, sequence }, null, 2)}\n`);
}

async function writeControllerReply(runDir, state, action, content, metadata = {}) {
  const sequence = (state.replies?.length ?? 0) + 1;
  const repliesDir = path.join(controllerRoot(runDir), "replies");
  await fsp.mkdir(repliesDir, { recursive: true });
  const replyPath = path.join(
    repliesDir,
    `${String(sequence).padStart(3, "0")}-${assertSafeSegment(action, "controller action")}.md`,
  );
  await fsp.writeFile(replyPath, `${content.trim()}\n`);
  state.replies = state.replies ?? [];
  state.replies.push({
    sequence,
    action,
    file: path.relative(runDir, replyPath),
    createdAt: new Date().toISOString(),
    ...metadata,
  });
  state.updatedAt = new Date().toISOString();
  await writeJson(controllerStatePath(runDir), state);
  return replyPath;
}

async function commandScenarioReply(options) {
  const runDir = path.resolve(options.one("run-dir"));
  const run = await readJson(path.join(runDir, "run.json"));
  if (run.benchmarkMode !== "full-loop") {
    throw new Error(`scenario-reply is only valid for full-loop runs: ${runDir}`);
  }
  const definition = await loadDefinition(run.benchmark.id);
  const { scenario } = await loadScenario(definition);
  const state = await readControllerState(runDir);
  if (state.phase !== "brainstorm") {
    throw new Error(`Controller is not accepting brainstorm replies in phase ${state.phase}`);
  }

  const rawEvents = options.all("event");
  const finalizeAttempt = options.bool("finalize-attempt");
  if ((rawEvents.length === 0) === !finalizeAttempt) {
    throw new Error("Use either one or more --event values or --finalize-attempt true");
  }

  const confirmed = new Set(state.confirmedDecisionIds ?? []);
  const decisionById = new Map(scenario.requiredDecisions.map((decision) => [decision.id, decision]));
  const missingIds = () => scenario.requiredDecisions
    .map((decision) => decision.id)
    .filter((id) => !confirmed.has(id));

  if (finalizeAttempt) {
    const missing = missingIds();
    if (missing.length === 0) {
      state.phase = "awaiting-contract";
      const replyPath = await writeControllerReply(
        runDir,
        state,
        "request-contract",
        scenario.contractPrompt,
        { kind: "contract", decisions: [] },
      );
      process.stdout.write(
        `${JSON.stringify({
          action: "request-contract",
          reply: replyPath,
          confirmedDecisionIds: [...confirmed],
          missingDecisionIds: [],
          interaction: interactionSummary(state),
        }, null, 2)}\n`,
      );
      return;
    }
    if ((state.dialogueTurns ?? 0) >= state.turnBudget) {
      state.phase = "dialogue-limit";
      state.updatedAt = new Date().toISOString();
      await writeJson(controllerStatePath(runDir), state);
      process.stdout.write(
        `${JSON.stringify({
          action: "dialogue-limit",
          reply: null,
          confirmedDecisionIds: [...confirmed],
          missingDecisionIds: missing,
          interaction: interactionSummary(state),
        }, null, 2)}\n`,
      );
      return;
    }

    const decision = decisionById.get(missing[0]);
    confirmed.add(decision.id);
    state.confirmedDecisionIds = scenario.requiredDecisions
      .map((candidate) => candidate.id)
      .filter((id) => confirmed.has(id));
    state.dialogueTurns = (state.dialogueTurns ?? 0) + 1;
    state.objectionTurns = (state.objectionTurns ?? 0) + 1;
    state.events.push({
      sequence: state.events.length + 1,
      type: "missing-at-finalize",
      decision: decision.id,
      createdAt: new Date().toISOString(),
    });
    const replyPath = await writeControllerReply(
      runDir,
      state,
      "reply",
      decision.responses.missingAtFinalize,
      { kind: "objection", decisions: [decision.id] },
    );
    process.stdout.write(
      `${JSON.stringify({
        action: "reply",
        kind: "objection",
        decisions: [decision.id],
        reply: replyPath,
        confirmedDecisionIds: state.confirmedDecisionIds,
        missingDecisionIds: missingIds(),
        interaction: interactionSummary(state),
      }, null, 2)}\n`,
    );
    return;
  }

  if ((state.dialogueTurns ?? 0) >= state.turnBudget) {
    state.phase = "dialogue-limit";
    state.updatedAt = new Date().toISOString();
    await writeJson(controllerStatePath(runDir), state);
    process.stdout.write(
      `${JSON.stringify({
        action: "dialogue-limit",
        reply: null,
        confirmedDecisionIds: [...confirmed],
        missingDecisionIds: missingIds(),
        interaction: interactionSummary(state),
      }, null, 2)}\n`,
    );
    return;
  }

  const fragments = [];
  const decisions = [];
  const kinds = new Set();
  const normalizedEvents = [];
  const decisionOrder = new Map(
    scenario.requiredDecisions.map((decision, index) => [decision.id, index]),
  );
  const policyOrder = new Map([
    ["discretionary", 0],
    ["scope-expansion", 1],
    ["unknown", 2],
  ]);
  const orderedEvents = [...rawEvents].sort((left, right) => {
    const splitEvent = (raw) => {
      const separator = raw.lastIndexOf(":");
      return { id: raw.slice(0, separator), type: raw.slice(separator + 1) };
    };
    const leftEvent = splitEvent(left);
    const rightEvent = splitEvent(right);
    const leftOrder = leftEvent.id === "policy"
      ? scenario.requiredDecisions.length + (policyOrder.get(leftEvent.type) ?? 99)
      : (decisionOrder.get(leftEvent.id) ?? 999);
    const rightOrder = rightEvent.id === "policy"
      ? scenario.requiredDecisions.length + (policyOrder.get(rightEvent.type) ?? 99)
      : (decisionOrder.get(rightEvent.id) ?? 999);
    return leftOrder - rightOrder || left.localeCompare(right);
  });
  const seenEventSubjects = new Set();
  for (const rawEvent of orderedEvents) {
    const separator = rawEvent.lastIndexOf(":");
    if (separator < 1) {
      throw new Error(`Scenario event must use id:type: ${rawEvent}`);
    }
    const id = rawEvent.slice(0, separator);
    const type = rawEvent.slice(separator + 1);
    const subject = id === "policy" ? rawEvent : id;
    if (seenEventSubjects.has(subject)) {
      throw new Error(`Only one scenario event per decision or policy is allowed in a turn: ${subject}`);
    }
    seenEventSubjects.add(subject);
    if (id === "policy") {
      const policyKey = {
        discretionary: "discretionary",
        "scope-expansion": "scopeExpansion",
        unknown: "unknown",
      }[type];
      if (!policyKey || !scenario.policies?.[policyKey]) {
        throw new Error(`Unknown scenario policy event: ${rawEvent}`);
      }
      fragments.push(scenario.policies[policyKey]);
      kinds.add("policy");
      normalizedEvents.push({ type: "policy", policy: type });
      continue;
    }

    const decision = decisionById.get(id);
    if (!decision) {
      throw new Error(`Unknown scenario decision: ${id}`);
    }
    const responseKey = {
      asked: "asked",
      correct: "correctProposal",
      incorrect: "incorrectProposal",
    }[type];
    if (!responseKey) {
      throw new Error(`Unknown decision event type for ${id}: ${type}`);
    }
    const kind = type === "asked" ? "answer" : type === "correct" ? "confirmation" : "objection";
    fragments.push(decision.responses[responseKey]);
    kinds.add(kind);
    decisions.push(id);
    normalizedEvents.push({ type, decision: id, repeated: confirmed.has(id) });
    confirmed.add(id);
  }

  const dominantKind = kinds.has("objection")
    ? "objection"
    : kinds.has("answer")
      ? "answer"
      : kinds.has("confirmation")
        ? "confirmation"
        : "policy";
  state.confirmedDecisionIds = scenario.requiredDecisions
    .map((decision) => decision.id)
    .filter((id) => confirmed.has(id));
  state.dialogueTurns = (state.dialogueTurns ?? 0) + 1;
  if (kinds.has("answer")) state.answerTurns = (state.answerTurns ?? 0) + 1;
  if (kinds.has("confirmation")) state.confirmationTurns = (state.confirmationTurns ?? 0) + 1;
  if (kinds.has("objection")) state.objectionTurns = (state.objectionTurns ?? 0) + 1;
  if (kinds.has("policy")) state.policyTurns = (state.policyTurns ?? 0) + 1;
  for (const event of normalizedEvents) {
    state.events.push({
      sequence: state.events.length + 1,
      ...event,
      createdAt: new Date().toISOString(),
    });
  }
  const replyPath = await writeControllerReply(
    runDir,
    state,
    "reply",
    fragments.join("\n\n"),
    { kind: dominantKind, decisions: [...new Set(decisions)] },
  );
  process.stdout.write(
    `${JSON.stringify({
      action: "reply",
      kind: dominantKind,
      decisions: [...new Set(decisions)],
      reply: replyPath,
      confirmedDecisionIds: state.confirmedDecisionIds,
      missingDecisionIds: missingIds(),
      interaction: interactionSummary(state),
    }, null, 2)}\n`,
  );
}

async function commandRecordContract(options) {
  const runDir = path.resolve(options.one("run-dir"));
  const contractFile = path.resolve(options.one("contract-file"));
  const run = await readJson(path.join(runDir, "run.json"));
  if (run.benchmarkMode !== "full-loop") {
    throw new Error(`record-contract is only valid for full-loop runs: ${runDir}`);
  }
  const definition = await loadDefinition(run.benchmark.id);
  const { scenario } = await loadScenario(definition);
  const state = await readControllerState(runDir);
  if (state.phase !== "awaiting-contract") {
    throw new Error(`Contract cannot be recorded in controller phase ${state.phase}`);
  }

  const requiredIds = scenario.requiredDecisions.map((decision) => decision.id);
  const requiredSet = new Set(requiredIds);
  const readDecisionIds = (key) => [...new Set(options.all(key).map((id) => {
    assertSafeSegment(id, `${key} decision id`);
    if (!requiredSet.has(id)) throw new Error(`Unknown ${key} decision id: ${id}`);
    return id;
  }))];
  const matched = readDecisionIds("matched");
  const contradictions = readDecisionIds("contradiction");
  const invented = options.all("invented");
  const uncertain = options.all("uncertain");
  const matchedSet = new Set(matched);
  const missing = requiredIds.filter((id) => !matchedSet.has(id));
  const prematureStatus = runProcess(["git", "status", "--short"], run.workspace, 60_000);
  if (!prematureStatus.ok) {
    throw new Error(`Could not inspect pre-execution workspace state: ${prematureStatus.stderr}`);
  }
  const prematureWorkspaceChanges = prematureStatus.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const status = uncertain.length > 0
    ? "EVAL_INVALID"
    : missing.length === 0
        && contradictions.length === 0
        && invented.length === 0
        && prematureWorkspaceChanges.length === 0
      ? "PASS"
      : "FAIL";

  const savedContract = path.join(runDir, "goal-contract.md");
  await fsp.copyFile(contractFile, savedContract);
  const result = {
    schemaVersion: 1,
    status,
    matchedDecisionIds: matched,
    missingDecisionIds: missing,
    contradictionDecisionIds: contradictions,
    inventedMaterialDecisions: invented,
    uncertainMappings: uncertain,
    prematureWorkspaceChanges,
    contractFile: path.basename(savedContract),
    recordedAt: new Date().toISOString(),
  };
  await writeJson(contractResultPath(runDir), result);

  state.phase = status === "PASS"
    ? "ready-to-execute"
    : status === "EVAL_INVALID"
      ? "eval-invalid"
      : "contract-failed";
  state.updatedAt = new Date().toISOString();
  await writeJson(controllerStatePath(runDir), state);
  await updateRun(runDir, (current) => {
    current.contractStatus = status;
    return current;
  });

  let executeInput = null;
  if (status === "PASS") {
    executeInput = path.join(controllerRoot(runDir), "execute.md");
    await fsp.writeFile(executeInput, `${scenario.executePrompt.trim()}\n`);
  }
  process.stdout.write(`${JSON.stringify({ ...result, executeInput }, null, 2)}\n`);
}

async function commandJudge(options) {
  const runDir = path.resolve(options.one("run-dir"));
  const requestedTerminalStatus = oneOf(
    options.one("terminal-status", "completed"),
    ["completed", "NEEDS_INPUT", "DIALOGUE_LIMIT", "CONTRACT_FAIL", "TARGET_ERROR", "EVAL_INVALID", "INFRA_ERROR"],
    "terminal status",
  );
  const run = await updateRun(runDir, (current) => {
    if (current.status === "aborted") {
      throw new Error(`Cannot judge an aborted run: ${runDir}`);
    }
    finishActiveTurn(current);
    current.terminalStatus = requestedTerminalStatus;
    return current;
  });
  const definition = await loadDefinition(run.benchmark.id);
  const workspace = run.workspace;
  const contractResult = (await fileExists(contractResultPath(runDir)))
    ? await readJson(contractResultPath(runDir))
    : null;
  const controllerState = (await fileExists(controllerStatePath(runDir)))
    ? await readJson(controllerStatePath(runDir))
    : null;
  let terminalStatus = requestedTerminalStatus;
  if (run.benchmarkMode === "full-loop" && requestedTerminalStatus === "completed") {
    if (!contractResult) {
      throw new Error(`A completed full-loop run requires contract-result.json: ${runDir}`);
    }
    if (contractResult.status === "EVAL_INVALID") terminalStatus = "EVAL_INVALID";
    else if (contractResult.status !== "PASS") terminalStatus = "CONTRACT_FAIL";
    else if (controllerState?.phase !== "execution-completed") {
      throw new Error(`A completed full-loop run requires a recorded final executor turn: ${runDir}`);
    }
  }

  runProcess(["git", "add", "-N", "--", "."], workspace, 60_000);
  const diff = runProcess(["git", "diff", "--binary", run.baseline, "--", "."], workspace, 60_000);
  const status = runProcess(["git", "status", "--short"], workspace, 60_000);
  await fsp.writeFile(path.join(runDir, "changes.diff"), diff.stdout);
  await fsp.writeFile(path.join(runDir, "workspace-status.txt"), status.stdout);

  const checks = [];
  const logs = [];
  const shouldRunArtifactChecks = ["completed", "TARGET_ERROR"].includes(terminalStatus);
  if (shouldRunArtifactChecks) {
    for (const check of definition.publicChecks) {
      const result = { id: check.id, ...runProcess(check.command, workspace, check.timeoutMs ?? 600_000) };
      checks.push(result);
      logs.push(processLog(result));
    }

    const injected = [];
    try {
      for (const oracleFile of definition.oracleFiles) {
        const source = path.join(benchmarkRoot, definition.id, oracleFile.source);
        const destination = path.join(workspace, oracleFile.destination);
        await fsp.mkdir(path.dirname(destination), { recursive: true });
        await fsp.copyFile(source, destination);
        injected.push(destination);
      }
      for (const check of definition.oracleChecks) {
        const result = { id: check.id, ...runProcess(check.command, workspace, check.timeoutMs ?? 600_000) };
        checks.push(result);
        logs.push(processLog(result));
      }
    } finally {
      for (const filePath of injected) {
        await fsp.rm(filePath, { force: true });
      }
    }
  }

  const initialDependencies = await readJson(path.join(runDir, "initial-dependencies.json"));
  const finalDependencies = await dependencySnapshot(workspace);
  const dependencyCheck = {
    id: "dependency-contract",
    command: ["internal", "compare-dependencies"],
    ok: stableJson(initialDependencies) === stableJson(finalDependencies),
    exitCode: null,
    signal: null,
    durationMs: 0,
    stdout: stableJson(initialDependencies) === stableJson(finalDependencies)
      ? "Dependency declarations and lockfile are unchanged."
      : "Dependency declarations or lockfile changed.",
    stderr: "",
    error: null,
  };
  checks.push(dependencyCheck);
  logs.push(processLog(dependencyCheck));

  const checksPass = checks.every((check) => check.ok);
  const resultStatus = terminalStatus === "NEEDS_INPUT"
    ? "NEEDS_INPUT"
    : terminalStatus === "EVAL_INVALID"
      ? "EVAL_INVALID"
      : terminalStatus === "INFRA_ERROR"
        ? "INFRA_ERROR"
        : terminalStatus === "completed" && checksPass
          ? "PASS"
          : "FAIL";
  const result = {
    schemaVersion: 3,
    target: run.target.id,
    benchmark: run.benchmark.id,
    benchmarkMode: run.benchmarkMode ?? "executor-only",
    attempt: run.attempt,
    status: resultStatus,
    terminalStatus,
    elapsedMs: run.activeDurationMs,
    executionMode: run.executionMode ?? "sequential",
    speedMetric: run.speedMetric ?? "target-active-duration-ms",
    dispatchIndex: run.dispatchIndex ?? null,
    firstActiveStartedAt: run.firstActiveStartedAt ?? null,
    lastActiveStoppedAt: run.lastActiveStoppedAt ?? null,
    activeSegments: run.activeSegments ?? [],
    contract: contractResult,
    interaction: interactionSummary(controllerState),
    checks: checks.map(({ stdout, stderr, ...check }) => check),
    judgedAt: new Date().toISOString(),
  };
  await fsp.writeFile(path.join(runDir, "oracle.log"), `${logs.join("\n")}\n`);
  await writeJson(path.join(runDir, "result.json"), result);
  await updateRun(runDir, (current) => {
    current.status = "judged";
    current.terminalStatus = terminalStatus;
    current.resultStatus = resultStatus;
    current.finishedAt = new Date().toISOString();
    return current;
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[middle - 1] + sorted[middle]) / 2) : sorted[middle];
}

function percentile(values, percentileValue) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(percentileValue * sorted.length) - 1)];
}

function formatDuration(value) {
  if (value === null) return "-";
  const seconds = Math.round(value / 1000);
  const minutes = Math.floor(seconds / 60);
  return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
}

async function commandSummarize(options) {
  const sessionDir = path.resolve(options.one("session"));
  if (await fileExists(path.join(sessionDir, "aborted.json"))) {
    throw new Error(`Cannot summarize an aborted benchmark session: ${sessionDir}`);
  }
  const manifest = await readJson(path.join(sessionDir, "manifest.json"));
  const benchmarkMode = manifest.benchmarkMode ?? "executor-only";
  const nonScorableStatuses = new Set(["EVAL_INVALID", "INFRA_ERROR", "MISSING"]);
  const groups = [];
  for (const target of manifest.targets) {
    for (const benchmark of manifest.benchmarks) {
      const results = [];
      for (let attempt = 1; attempt <= manifest.repetitions; attempt += 1) {
        const runDir = path.join(sessionDir, target.id, benchmark, `run-${String(attempt).padStart(3, "0")}`);
        const resultPath = path.join(runDir, "result.json");
        if (await fileExists(resultPath)) {
          results.push({ ...(await readJson(resultPath)), runDir: path.relative(sessionDir, runDir) });
        } else {
          results.push({ target: target.id, benchmark, benchmarkMode, attempt, status: "MISSING", elapsedMs: null, interaction: null, contract: null, checks: [], runDir: path.relative(sessionDir, runDir) });
        }
      }
      const passed = results.filter((result) => result.status === "PASS");
      const scorable = results.filter((result) => !nonScorableStatuses.has(result.status));
      const successfulDialogueTurns = passed
        .map((result) => result.interaction?.dialogueTurns)
        .filter((value) => Number.isFinite(value));
      const successfulObjectionTurns = passed
        .map((result) => result.interaction?.objectionTurns)
        .filter((value) => Number.isFinite(value));
      const failureChecks = {};
      for (const result of results.filter((item) => item.status === "FAIL")) {
        for (const check of result.checks.filter((item) => !item.ok)) {
          failureChecks[check.id] = (failureChecks[check.id] ?? 0) + 1;
        }
      }
      groups.push({
        target: target.id,
        benchmark,
        attempts: manifest.repetitions,
        scorable: scorable.length,
        passed: passed.length,
        failed: results.filter((result) => result.status === "FAIL").length,
        needsInput: results.filter((result) => result.status === "NEEDS_INPUT").length,
        evalInvalid: results.filter((result) => result.status === "EVAL_INVALID").length,
        infraError: results.filter((result) => result.status === "INFRA_ERROR").length,
        missing: results.filter((result) => result.status === "MISSING").length,
        contractPassed: results.filter((result) => result.contract?.status === "PASS").length,
        successRate: scorable.length > 0 ? passed.length / scorable.length : null,
        medianSuccessDialogueTurns: median(successfulDialogueTurns),
        medianSuccessObjectionTurns: median(successfulObjectionTurns),
        medianSuccessMs: median(passed.map((result) => result.elapsedMs)),
        p90SuccessMs: percentile(passed.map((result) => result.elapsedMs), 0.9),
        failureChecks,
        results,
      });
    }
  }

  const targets = manifest.targets.map((target) => {
    const targetGroups = groups.filter((group) => group.target === target.id);
    const results = targetGroups.flatMap((group) => group.results);
    const passed = results.filter((result) => result.status === "PASS");
    const scorable = results.filter((result) => !nonScorableStatuses.has(result.status));
    return {
      id: target.id,
      attempts: results.length,
      scorable: scorable.length,
      passed: passed.length,
      successRate: scorable.length > 0 ? passed.length / scorable.length : null,
      medianSuccessDialogueTurns: median(
        passed.map((result) => result.interaction?.dialogueTurns).filter((value) => Number.isFinite(value)),
      ),
      medianSuccessObjectionTurns: median(
        passed.map((result) => result.interaction?.objectionTurns).filter((value) => Number.isFinite(value)),
      ),
      medianSuccessMs: median(passed.map((result) => result.elapsedMs)),
      p90SuccessMs: percentile(passed.map((result) => result.elapsedMs), 0.9),
      benchmarks: targetGroups,
    };
  });
  const rankedTargets = [...targets].sort((left, right) => {
    const leftRate = left.successRate ?? -1;
    const rightRate = right.successRate ?? -1;
    if (leftRate !== rightRate) return rightRate - leftRate;
    if (benchmarkMode === "full-loop") {
      const leftTurns = left.medianSuccessDialogueTurns ?? Number.POSITIVE_INFINITY;
      const rightTurns = right.medianSuccessDialogueTurns ?? Number.POSITIVE_INFINITY;
      if (leftTurns !== rightTurns) return leftTurns - rightTurns;
    }
    const leftMedian = left.medianSuccessMs ?? Number.POSITIVE_INFINITY;
    const rightMedian = right.medianSuccessMs ?? Number.POSITIVE_INFINITY;
    if (leftMedian !== rightMedian) return leftMedian - rightMedian;
    return left.id.localeCompare(right.id);
  });
  let previousRankedTarget = null;
  let currentRank = 0;
  const ranking = rankedTargets.map((target, index) => {
    const sameScore = previousRankedTarget
      && target.successRate === previousRankedTarget.successRate
      && (benchmarkMode !== "full-loop"
        || target.medianSuccessDialogueTurns === previousRankedTarget.medianSuccessDialogueTurns)
      && target.medianSuccessMs === previousRankedTarget.medianSuccessMs;
    if (!sameScore) currentRank = index + 1;
    previousRankedTarget = target;
    return {
      rank: currentRank,
      target: target.id,
      successRate: target.successRate,
      medianSuccessDialogueTurns: target.medianSuccessDialogueTurns,
      medianSuccessObjectionTurns: target.medianSuccessObjectionTurns,
      medianSuccessMs: target.medianSuccessMs,
      p90SuccessMs: target.p90SuccessMs,
    };
  });
  const summary = {
    schemaVersion: 3,
    sessionDir,
    generatedAt: new Date().toISOString(),
    benchmarkMode,
    repetitions: manifest.repetitions,
    execution: {
      ...(manifest.execution ?? {
        mode: "sequential",
        speedMetric: "target-active-duration-ms",
      }),
      observedDispatch: (() => {
        const starts = groups
          .flatMap((group) => group.results)
          .map((result) => result.firstActiveStartedAt)
          .filter((value) => Number.isFinite(value));
        if (starts.length === 0) {
          return { startedRuns: 0, firstStartedAt: null, lastStartedAt: null, skewMs: null };
        }
        const firstStartedAt = Math.min(...starts);
        const lastStartedAt = Math.max(...starts);
        return {
          startedRuns: starts.length,
          firstStartedAt,
          lastStartedAt,
          skewMs: lastStartedAt - firstStartedAt,
        };
      })(),
    },
    ranking,
    targets,
  };
  await writeJson(path.join(sessionDir, "summary.json"), summary);

  const report = [
    "# Workbench Benchmark Report",
    "",
    `- Benchmark mode: ${benchmarkMode}`,
    `- Runs per target and benchmark: ${manifest.repetitions}`,
    `- Execution: ${summary.execution.mode}`,
    `- Requested concurrency: ${summary.execution.requestedConcurrency ?? "not recorded"}`,
    `- Speed metric: ${summary.execution.speedMetric}`,
    `- Dispatch skew: ${formatDuration(summary.execution.observedDispatch.skewMs)}`,
    `- Scoring: ${benchmarkMode === "full-loop" ? "end-to-end success first; successful dialogue turns, then parallel-load latency break ties" : "artifact success first; parallel-load latency breaks ties"}`,
    `- Process trace: retained for review; exact path and skill names never change PASS/FAIL`,
    "",
    "## Overall ranking",
    "",
    "| Rank | Target | Success | Scorable | Median dialogue turns | Median latency | p90 latency |",
    "| ---: | --- | ---: | ---: | ---: | ---: | ---: |",
  ];
  for (const item of ranking) {
    const target = targets.find((candidate) => candidate.id === item.target);
    report.push(
      `| ${item.rank} | ${item.target} | ${target.passed}/${target.scorable} | ${target.scorable}/${target.attempts} | ${item.medianSuccessDialogueTurns ?? "-"} | ${formatDuration(item.medianSuccessMs)} | ${formatDuration(item.p90SuccessMs)} |`,
    );
  }
  report.push(
    "",
    "## Results by benchmark",
    "",
    "| Target | Benchmark | Success | Contract pass | Median dialogue | Median objections | Median latency | p90 latency | Needs input | Eval invalid | Infra error | Missing |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  );
  for (const group of groups) {
    report.push(
      `| ${group.target} | ${group.benchmark} | ${group.passed}/${group.scorable} | ${benchmarkMode === "full-loop" ? `${group.contractPassed}/${group.attempts}` : "-"} | ${group.medianSuccessDialogueTurns ?? "-"} | ${group.medianSuccessObjectionTurns ?? "-"} | ${formatDuration(group.medianSuccessMs)} | ${formatDuration(group.p90SuccessMs)} | ${group.needsInput} | ${group.evalInvalid} | ${group.infraError} | ${group.missing} |`,
    );
  }
  report.push("", "## Failure checks", "");
  for (const group of groups) {
    const entries = Object.entries(group.failureChecks).sort((left, right) => right[1] - left[1]);
    report.push(`### ${group.target} / ${group.benchmark}`, "");
    if (entries.length === 0) {
      report.push("- None", "");
    } else {
      for (const [check, count] of entries) report.push(`- ${check}: ${count}`, "");
    }
  }
  report.push("## Run artifacts", "");
  for (const group of groups) {
    report.push(`### ${group.target} / ${group.benchmark}`, "");
    for (const result of group.results) {
      report.push(`- ${result.status}: [run-${String(result.attempt).padStart(3, "0")}](${result.runDir}/)`);
    }
    report.push("");
  }
  await fsp.writeFile(path.join(sessionDir, "report.md"), `${report.join("\n").trimEnd()}\n`);
  process.stdout.write(`${JSON.stringify({ summary: path.join(sessionDir, "summary.json"), report: path.join(sessionDir, "report.md") }, null, 2)}\n`);
}

async function main() {
  const [command, ...argv] = process.argv.slice(2);
  if (!command || ["-h", "--help", "help"].includes(command)) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const options = parseOptions(argv);
  const handlers = {
    init: commandInit,
    prepare: commandPrepare,
    "clock-start": commandClockStart,
    "clock-stop": commandClockStop,
    "record-turn": commandRecordTurn,
    "scenario-reply": commandScenarioReply,
    "record-contract": commandRecordContract,
    judge: commandJudge,
    abort: commandAbort,
    summarize: commandSummarize,
  };
  const handler = handlers[command];
  if (!handler) {
    throw new Error(`Unknown command: ${command}\n${usage()}`);
  }
  await handler(options);
}

main().catch((error) => {
  process.stderr.write(`evaluate-workbench: ${error.message}\n`);
  process.exitCode = 1;
});
