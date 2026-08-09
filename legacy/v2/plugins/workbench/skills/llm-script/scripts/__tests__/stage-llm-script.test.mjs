import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const STAGE_SCRIPT = path.resolve(TEST_DIR, "..", "stage-llm-script.mjs");
const CAPTURE_SCRIPT = path.resolve(TEST_DIR, "..", "capture-script-source.mjs");
const temporaryRoots = [];

function makeTemporaryRoot(prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  temporaryRoots.push(root);
  return root;
}

test.after(() => {
  for (const root of temporaryRoots) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env || process.env,
    input: options.input,
    encoding: "utf8",
    stdio: [options.input === undefined ? "ignore" : "pipe", "pipe", "pipe"]
  });

  if (options.acceptFailure !== true && result.status !== 0) {
    assert.fail([
      `${command} ${args.join(" ")} failed with status ${result.status}`,
      result.stderr,
      result.stdout
    ].filter(Boolean).join("\n"));
  }
  return result;
}

function git(args, cwd) {
  return run("git", args, { cwd }).stdout.trim();
}

function createBareRemote() {
  const root = makeTemporaryRoot("llm-script-stage-remote-");
  const seed = path.join(root, "seed");
  const remote = path.join(root, "llm-script.git");

  fs.mkdirSync(seed);
  git(["init", "--initial-branch=main"], seed);
  git(["config", "user.name", "Workbench Test"], seed);
  git(["config", "user.email", "workbench@example.test"], seed);
  fs.writeFileSync(path.join(seed, "README.md"), "# LLM Script\n", "utf8");
  git(["add", "README.md"], seed);
  git(["commit", "-m", "initial"], seed);
  git(["clone", "--bare", seed, remote], root);

  return { remote, seed };
}

function advanceRemote({ remote, seed }) {
  fs.writeFileSync(path.join(seed, "remote-only.txt"), "new remote commit\n", "utf8");
  git(["add", "remote-only.txt"], seed);
  git(["commit", "-m", "advance remote"], seed);
  git(["push", remote, "main"], seed);
}

function createWorkspace(root, packageName = "@example/fixture") {
  const workspace = path.join(root, "workspace");
  fs.mkdirSync(workspace, { recursive: true });
  fs.writeFileSync(
    path.join(workspace, "package.json"),
    `${JSON.stringify({ name: packageName }, null, 2)}\n`,
    "utf8"
  );
  return workspace;
}

function runStage(args, env = {}) {
  return run(process.execPath, ["--no-global-search-paths", STAGE_SCRIPT, ...args], {
    env: { ...process.env, ...env },
    acceptFailure: true
  });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

test("clones once, stores the canonical workspace, and is byte-idempotent", () => {
  const fixtureRoot = makeTemporaryRoot("llm-script-stage-");
  const workspace = createWorkspace(fixtureRoot);
  const workspaceAlias = path.join(fixtureRoot, "workspace-alias");
  const llmScriptRoot = path.join(fixtureRoot, "collection");
  const remoteFixture = createBareRemote();
  fs.symlinkSync(workspace, workspaceAlias, "dir");

  const args = [
    "--workspace-root", workspaceAlias,
    "--llm-script-root", llmScriptRoot,
    "--repo", remoteFixture.remote,
    "--branch", "main"
  ];
  const first = runStage(args);
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /Branch: main/u);
  assert.match(first.stdout, /Nested repo status: clean/u);

  const canonicalWorkspace = fs.realpathSync(workspace);
  const configPath = path.join(llmScriptRoot, "config.json");
  const workspacesPath = path.join(llmScriptRoot, "workspaces.json");
  const sourceRoot = path.join(llmScriptRoot, "source");
  assert.deepEqual(readJson(configPath), {
    schemaVersion: 1,
    repo: remoteFixture.remote,
    branch: "main",
    enabled: true,
    maxSourceBytes: 131072
  });
  assert.deepEqual(readJson(workspacesPath), {
    workspaces: {
      [canonicalWorkspace]: {
        project: "fixture",
        capture: true
      }
    }
  });
  assert.equal(git(["rev-parse", "--show-toplevel"], sourceRoot), fs.realpathSync(sourceRoot));
  assert.equal(git(["status", "--porcelain"], sourceRoot), "");

  const firstConfig = fs.readFileSync(configPath, "utf8");
  const firstWorkspaces = fs.readFileSync(workspacesPath, "utf8");
  const clonedHead = git(["rev-parse", "HEAD"], sourceRoot);
  fs.writeFileSync(path.join(sourceRoot, "local-only.txt"), "preserve me\n", "utf8");
  advanceRemote(remoteFixture);

  const second = runStage(args);
  assert.equal(second.status, 0, second.stderr);
  assert.match(second.stdout, /Metadata: unchanged/u);
  assert.match(second.stdout, /\?\? local-only\.txt/u);
  assert.equal(fs.readFileSync(configPath, "utf8"), firstConfig);
  assert.equal(fs.readFileSync(workspacesPath, "utf8"), firstWorkspaces);
  assert.equal(git(["rev-parse", "HEAD"], sourceRoot), clonedHead, "setup must not pull");
  assert.equal(fs.readFileSync(path.join(sourceRoot, "local-only.txt"), "utf8"), "preserve me\n");
  assert.match(git(["status", "--porcelain"], sourceRoot), /\?\? local-only\.txt/u);
  assert.equal(fs.existsSync(path.join(sourceRoot, "remote-only.txt")), false);
});

test("preserves extra metadata and other mappings while updating setup-owned fields", () => {
  const fixtureRoot = makeTemporaryRoot("llm-script-stage-preserve-");
  const workspace = createWorkspace(fixtureRoot, "original-project");
  const llmScriptRoot = path.join(fixtureRoot, "collection");
  const { remote } = createBareRemote();
  const baseArgs = [
    "--workspace-root", workspace,
    "--llm-script-root", llmScriptRoot,
    "--repo", remote,
    "--branch", "main"
  ];
  assert.equal(runStage(baseArgs).status, 0);

  const configPath = path.join(llmScriptRoot, "config.json");
  const workspacesPath = path.join(llmScriptRoot, "workspaces.json");
  const canonicalWorkspace = fs.realpathSync(workspace);
  fs.writeFileSync(configPath, `${JSON.stringify({
    schemaVersion: 99,
    repo: "stale-repo",
    branch: "stale-branch",
    enabled: false,
    maxSourceBytes: 4096,
    retention: { mode: "append-only" },
    customFlag: "keep"
  }, null, 2)}\n`, "utf8");
  fs.writeFileSync(workspacesPath, `${JSON.stringify({
    workspaces: {
      "/another/workspace": { project: "other", capture: false, owner: "keep" },
      [canonicalWorkspace]: { project: "old", capture: false, label: "keep" }
    },
    format: "custom"
  }, null, 2)}\n`, "utf8");

  const result = runStage([
    "--workspace-root", workspace,
    "--llm-script-root", llmScriptRoot,
    "--project", "renamed",
    "--repo", remote,
    "--branch", "main"
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readJson(configPath), {
    schemaVersion: 1,
    repo: remote,
    branch: "main",
    enabled: true,
    maxSourceBytes: 4096,
    customFlag: "keep",
    retention: { mode: "append-only" }
  });
  assert.deepEqual(readJson(workspacesPath), {
    workspaces: {
      "/another/workspace": { project: "other", capture: false, owner: "keep" },
      [canonicalWorkspace]: { project: "renamed", capture: true, label: "keep" }
    },
    format: "custom"
  });

  const configAfter = fs.readFileSync(configPath, "utf8");
  const workspacesAfter = fs.readFileSync(workspacesPath, "utf8");
  const repeat = runStage([
    "--workspace-root", workspace,
    "--llm-script-root", llmScriptRoot,
    "--project", "renamed",
    "--repo", remote,
    "--branch", "main"
  ]);
  assert.equal(repeat.status, 0, repeat.stderr);
  assert.equal(fs.readFileSync(configPath, "utf8"), configAfter);
  assert.equal(fs.readFileSync(workspacesPath, "utf8"), workspacesAfter);
});

test("rejects an existing source with a different origin before changing metadata", () => {
  const fixtureRoot = makeTemporaryRoot("llm-script-stage-origin-");
  const workspace = createWorkspace(fixtureRoot);
  const llmScriptRoot = path.join(fixtureRoot, "collection");
  const firstRemote = createBareRemote().remote;
  const secondRemote = createBareRemote().remote;
  const initial = runStage([
    "--workspace-root", workspace,
    "--llm-script-root", llmScriptRoot,
    "--repo", firstRemote
  ]);
  assert.equal(initial.status, 0, initial.stderr);

  const configPath = path.join(llmScriptRoot, "config.json");
  const workspacesPath = path.join(llmScriptRoot, "workspaces.json");
  const configBefore = fs.readFileSync(configPath, "utf8");
  const workspacesBefore = fs.readFileSync(workspacesPath, "utf8");
  const rejected = runStage([
    "--workspace-root", workspace,
    "--llm-script-root", llmScriptRoot,
    "--project", "must-not-be-written",
    "--repo", secondRemote
  ]);

  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /LLM script origin mismatch/u);
  assert.equal(fs.readFileSync(configPath, "utf8"), configBefore);
  assert.equal(fs.readFileSync(workspacesPath, "utf8"), workspacesBefore);
});

test("rejects a branch mismatch without checking out or changing metadata", () => {
  const fixtureRoot = makeTemporaryRoot("llm-script-stage-branch-");
  const workspace = createWorkspace(fixtureRoot);
  const llmScriptRoot = path.join(fixtureRoot, "collection");
  const { remote } = createBareRemote();
  const initial = runStage([
    "--workspace-root", workspace,
    "--llm-script-root", llmScriptRoot,
    "--repo", remote,
    "--branch", "main"
  ]);
  assert.equal(initial.status, 0, initial.stderr);

  const sourceRoot = path.join(llmScriptRoot, "source");
  const configPath = path.join(llmScriptRoot, "config.json");
  const workspacesPath = path.join(llmScriptRoot, "workspaces.json");
  const configBefore = fs.readFileSync(configPath, "utf8");
  const workspacesBefore = fs.readFileSync(workspacesPath, "utf8");
  const headBefore = git(["rev-parse", "HEAD"], sourceRoot);
  const rejected = runStage([
    "--workspace-root", workspace,
    "--llm-script-root", llmScriptRoot,
    "--project", "must-not-be-written",
    "--repo", remote,
    "--branch", "release"
  ]);

  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /LLM script branch mismatch\. Expected release, found main/u);
  assert.equal(git(["branch", "--show-current"], sourceRoot), "main");
  assert.equal(git(["rev-parse", "HEAD"], sourceRoot), headBefore);
  assert.equal(fs.readFileSync(configPath, "utf8"), configBefore);
  assert.equal(fs.readFileSync(workspacesPath, "utf8"), workspacesBefore);
});

test("rejects a pre-existing non-Git source without bootstrapping it", () => {
  const fixtureRoot = makeTemporaryRoot("llm-script-stage-not-git-");
  const workspace = createWorkspace(fixtureRoot);
  const llmScriptRoot = path.join(fixtureRoot, "collection");
  const sourceRoot = path.join(llmScriptRoot, "source");
  const { remote } = createBareRemote();
  fs.mkdirSync(sourceRoot, { recursive: true });
  fs.writeFileSync(path.join(sourceRoot, "sentinel.txt"), "untouched\n", "utf8");

  const result = runStage([
    "--workspace-root", workspace,
    "--llm-script-root", llmScriptRoot,
    "--repo", remote
  ]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /git rev-parse/u);
  assert.equal(fs.readFileSync(path.join(sourceRoot, "sentinel.txt"), "utf8"), "untouched\n");
  assert.equal(fs.existsSync(path.join(llmScriptRoot, "config.json")), false);
  assert.equal(fs.existsSync(path.join(llmScriptRoot, "workspaces.json")), false);
});

test("rejects credential-bearing repository URLs before cloning or storing them", () => {
  const fixtureRoot = makeTemporaryRoot("llm-script-stage-secret-remote-");
  const workspace = createWorkspace(fixtureRoot);
  const llmScriptRoot = path.join(fixtureRoot, "collection");
  const result = runStage([
    "--workspace-root", workspace,
    "--llm-script-root", llmScriptRoot,
    "--repo", "https://user:password@example.test/llm-script.git"
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must not contain credentials/u);
  assert.equal(fs.existsSync(path.join(llmScriptRoot, "source")), false);
  assert.equal(fs.existsSync(path.join(llmScriptRoot, "config.json")), false);
});

test("uses CODEX_HOME for the default collection root", () => {
  const fixtureRoot = makeTemporaryRoot("llm-script-stage-codex-home-");
  const workspace = createWorkspace(fixtureRoot);
  const codexHome = path.join(fixtureRoot, "codex-home");
  const { remote } = createBareRemote();

  const result = runStage([
    "--workspace-root", workspace,
    "--repo", remote
  ], { CODEX_HOME: codexHome });
  assert.equal(result.status, 0, result.stderr);

  const expectedRoot = path.join(codexHome, "workbench", "llm-script");
  assert.equal(fs.existsSync(path.join(expectedRoot, "source", ".git")), true);
  assert.equal(readJson(path.join(expectedRoot, "config.json")).repo, remote);
});

test("a staged custom root captures when future hook processes receive the same root", () => {
  const fixtureRoot = makeTemporaryRoot("llm-script-stage-hook-");
  const workspace = createWorkspace(fixtureRoot);
  const llmScriptRoot = path.join(fixtureRoot, "collection");
  const { remote } = createBareRemote();
  fs.mkdirSync(path.join(workspace, "scripts"));
  fs.writeFileSync(path.join(workspace, "scripts", "check.mjs"), "console.log('captured');\n");

  const staged = runStage([
    "--workspace-root", workspace,
    "--llm-script-root", llmScriptRoot,
    "--repo", remote
  ]);
  assert.equal(staged.status, 0, staged.stderr);

  const hook = run(process.execPath, ["--no-global-search-paths", CAPTURE_SCRIPT], {
    env: { ...process.env, LLM_SCRIPT_ROOT: llmScriptRoot },
    input: JSON.stringify({
      hook_event_name: "PostToolUse",
      tool_name: "Bash",
      cwd: workspace,
      tool_input: { command: "node scripts/check.mjs" }
    })
  });
  assert.equal(hook.status, 0, hook.stderr);
  assert.equal(hook.stdout, "");
  assert.equal(hook.stderr, "");

  const recordsRoot = path.join(llmScriptRoot, "source", "records");
  const recordPath = fs.readdirSync(recordsRoot, { recursive: true })
    .find((entry) => String(entry).endsWith(".json"));
  assert.equal(typeof recordPath, "string");
  const record = readJson(path.join(recordsRoot, recordPath));
  assert.equal(record.source.code, "console.log('captured');\n");
});
