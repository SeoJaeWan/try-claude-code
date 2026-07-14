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

function usage() {
  return `Usage:
  benchmark-runner.mjs init --target <id=plugin-root> [--target ...] [--repetitions 5] [--output-root output/evaluate]
  benchmark-runner.mjs prepare --session <dir> --target <id> --benchmark <id> --attempt <n> [--skip-install true]
  benchmark-runner.mjs clock-start --run-dir <dir>
  benchmark-runner.mjs clock-stop --run-dir <dir>
  benchmark-runner.mjs record-turn --run-dir <dir> --input-file <file> --output-file <file> [--label agent-session] [--skill <name@path> ...]
  benchmark-runner.mjs judge --run-dir <dir> [--terminal-status completed|NEEDS_INPUT|ERROR]
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

function runProcess(command, cwd, timeoutMs = 600_000) {
  const startedAt = Date.now();
  const result = spawnSync(command[0], command.slice(1), {
    cwd,
    encoding: "utf8",
    env: { ...process.env, CI: "1", FORCE_COLOR: "0" },
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

async function commandInit(options) {
  const targetArgs = options.all("target");
  if (targetArgs.length === 0) {
    throw new Error("At least one --target id=plugin-root is required");
  }
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
        schedule.push({ target: target.id, benchmark, attempt });
      }
    }
  }

  const manifest = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    sessionDir,
    repetitions,
    benchmarks: benchmarkIds,
    targets,
    schedule,
    scoring: {
      primary: "success-rate",
      tieBreaker: "median-success-duration-ms",
      processTraceAffectsScore: false,
    },
  };
  await writeJson(path.join(sessionDir, "manifest.json"), manifest);
  process.stdout.write(`${JSON.stringify({ sessionDir, runs: schedule.length }, null, 2)}\n`);
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
  await fsp.copyFile(path.join(benchmarkRoot, benchmarkId, definition.prompt), path.join(runDir, "input.md"));

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
    schemaVersion: 1,
    status: "prepared",
    terminalStatus: null,
    target: runTarget,
    benchmark: { id: definition.id, title: definition.title },
    attempt,
    runDir,
    workspace,
    baseline,
    setupChecks,
    activeDurationMs: 0,
    activeTurnStartedAt: null,
    preparedAt: new Date().toISOString(),
  });

  process.stdout.write(
    `${JSON.stringify({ runDir, workspace, input: path.join(runDir, "input.md"), target: runTarget }, null, 2)}\n`,
  );
}

async function commandClockStart(options) {
  const runDir = path.resolve(options.one("run-dir"));
  const run = await updateRun(runDir, (current) => {
    if (current.activeTurnStartedAt !== null) {
      throw new Error(`A target turn is already active for ${runDir}`);
    }
    current.activeTurnStartedAt = Date.now();
    current.status = "running";
    return current;
  });
  process.stdout.write(`${JSON.stringify({ activeTurnStartedAt: run.activeTurnStartedAt })}\n`);
}

async function commandClockStop(options) {
  const runDir = path.resolve(options.one("run-dir"));
  const run = await updateRun(runDir, (current) => {
    if (current.activeTurnStartedAt === null) {
      throw new Error(`No target turn is active for ${runDir}`);
    }
    current.activeDurationMs += Date.now() - current.activeTurnStartedAt;
    current.activeTurnStartedAt = null;
    return current;
  });
  process.stdout.write(`${JSON.stringify({ activeDurationMs: run.activeDurationMs })}\n`);
}

async function commandRecordTurn(options) {
  const runDir = path.resolve(options.one("run-dir"));
  const inputFile = path.resolve(options.one("input-file"));
  const outputFile = path.resolve(options.one("output-file"));
  const label = assertSafeSegment(options.one("label", "agent-session"), "turn label");
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
    conversation.push(
      `## Turn ${meta.sequence} — ${meta.label}`,
      "",
      `- Skills: ${skillLabel}`,
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
      JSON.stringify({ turn: meta.sequence, role: "user", label: meta.label, skills: meta.skills, content: input }),
      JSON.stringify({ turn: meta.sequence, role: "assistant", label: meta.label, skills: meta.skills, content: output }),
    );
  }
  await fsp.writeFile(path.join(root, "conversation.md"), `${conversation.join("\n").trimEnd()}\n`);
  await fsp.writeFile(path.join(root, "events.jsonl"), `${events.join("\n")}\n`);
  process.stdout.write(`${JSON.stringify({ turnDir, sequence }, null, 2)}\n`);
}

async function commandJudge(options) {
  const runDir = path.resolve(options.one("run-dir"));
  const terminalStatus = options.one("terminal-status", "completed");
  const run = await updateRun(runDir, (current) => {
    if (current.activeTurnStartedAt !== null) {
      current.activeDurationMs += Date.now() - current.activeTurnStartedAt;
      current.activeTurnStartedAt = null;
    }
    current.terminalStatus = terminalStatus;
    return current;
  });
  const definition = await loadDefinition(run.benchmark.id);
  const workspace = run.workspace;

  runProcess(["git", "add", "-N", "--", "."], workspace, 60_000);
  const diff = runProcess(["git", "diff", "--binary", run.baseline, "--", "."], workspace, 60_000);
  const status = runProcess(["git", "status", "--short"], workspace, 60_000);
  await fsp.writeFile(path.join(runDir, "changes.diff"), diff.stdout);
  await fsp.writeFile(path.join(runDir, "workspace-status.txt"), status.stdout);

  const checks = [];
  const logs = [];
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
    : terminalStatus === "completed" && checksPass
      ? "PASS"
      : "FAIL";
  const result = {
    schemaVersion: 1,
    target: run.target.id,
    benchmark: run.benchmark.id,
    attempt: run.attempt,
    status: resultStatus,
    terminalStatus,
    elapsedMs: run.activeDurationMs,
    checks: checks.map(({ stdout, stderr, ...check }) => check),
    judgedAt: new Date().toISOString(),
  };
  await fsp.writeFile(path.join(runDir, "oracle.log"), `${logs.join("\n")}\n`);
  await writeJson(path.join(runDir, "result.json"), result);
  await updateRun(runDir, (current) => {
    current.status = "judged";
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
  const manifest = await readJson(path.join(sessionDir, "manifest.json"));
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
          results.push({ target: target.id, benchmark, attempt, status: "MISSING", elapsedMs: null, checks: [], runDir: path.relative(sessionDir, runDir) });
        }
      }
      const passed = results.filter((result) => result.status === "PASS");
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
        passed: passed.length,
        failed: results.filter((result) => result.status === "FAIL").length,
        needsInput: results.filter((result) => result.status === "NEEDS_INPUT").length,
        missing: results.filter((result) => result.status === "MISSING").length,
        successRate: passed.length / manifest.repetitions,
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
    return {
      id: target.id,
      attempts: results.length,
      passed: passed.length,
      successRate: passed.length / results.length,
      medianSuccessMs: median(passed.map((result) => result.elapsedMs)),
      p90SuccessMs: percentile(passed.map((result) => result.elapsedMs), 0.9),
      benchmarks: targetGroups,
    };
  });
  const rankedTargets = [...targets].sort((left, right) => {
    if (left.successRate !== right.successRate) return right.successRate - left.successRate;
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
      && target.medianSuccessMs === previousRankedTarget.medianSuccessMs;
    if (!sameScore) currentRank = index + 1;
    previousRankedTarget = target;
    return {
      rank: currentRank,
      target: target.id,
      successRate: target.successRate,
      medianSuccessMs: target.medianSuccessMs,
      p90SuccessMs: target.p90SuccessMs,
    };
  });
  const summary = {
    schemaVersion: 1,
    sessionDir,
    generatedAt: new Date().toISOString(),
    repetitions: manifest.repetitions,
    ranking,
    targets,
  };
  await writeJson(path.join(sessionDir, "summary.json"), summary);

  const report = [
    "# Workbench Benchmark Report",
    "",
    `- Runs per target and benchmark: ${manifest.repetitions}`,
    `- Scoring: final outcome first; median successful duration only breaks equal success rates`,
    `- Process trace: retained for review, never included in PASS/FAIL`,
    "",
    "## Overall ranking",
    "",
    "| Rank | Target | Success | Median | p90 |",
    "| ---: | --- | ---: | ---: | ---: |",
  ];
  for (const item of ranking) {
    const target = targets.find((candidate) => candidate.id === item.target);
    report.push(
      `| ${item.rank} | ${item.target} | ${target.passed}/${target.attempts} | ${formatDuration(item.medianSuccessMs)} | ${formatDuration(item.p90SuccessMs)} |`,
    );
  }
  report.push(
    "",
    "## Results by benchmark",
    "",
    "| Target | Benchmark | Success | Median | p90 | Needs input | Missing |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: |",
  );
  for (const group of groups) {
    report.push(
      `| ${group.target} | ${group.benchmark} | ${group.passed}/${group.attempts} | ${formatDuration(group.medianSuccessMs)} | ${formatDuration(group.p90SuccessMs)} | ${group.needsInput} | ${group.missing} |`,
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
    judge: commandJudge,
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
