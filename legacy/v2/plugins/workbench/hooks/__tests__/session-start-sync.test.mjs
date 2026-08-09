import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const hookScript = path.resolve(testDirectory, "..", "session-start-sync.mjs");

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.error || result.status !== 0) {
    throw new Error([
      `${command} ${args.join(" ")} failed`,
      result.error?.message,
      result.stdout,
      result.stderr
    ].filter(Boolean).join("\n"));
  }
  return result.stdout.trim();
}

function git(args, cwd) {
  return run("git", args, cwd);
}

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function createBehindClone(testRoot, name, sourceRoot) {
  const remoteRoot = path.join(testRoot, `${name}.git`);
  const seedRoot = path.join(testRoot, `${name}-seed`);

  git(["init", "--bare", "--initial-branch=main", remoteRoot], testRoot);
  git(["clone", remoteRoot, seedRoot], testRoot);
  git(["config", "user.name", "Workbench Test"], seedRoot);
  git(["config", "user.email", "workbench@example.com"], seedRoot);
  write(path.join(seedRoot, "state.txt"), "initial\n");
  git(["add", "state.txt"], seedRoot);
  git(["commit", "-m", "initial"], seedRoot);
  git(["push", "-u", "origin", "HEAD"], seedRoot);

  fs.mkdirSync(path.dirname(sourceRoot), { recursive: true });
  git(["clone", remoteRoot, sourceRoot], testRoot);

  write(path.join(seedRoot, "state.txt"), "latest\n");
  git(["add", "state.txt"], seedRoot);
  git(["commit", "-m", "latest"], seedRoot);
  git(["push"], seedRoot);

  return { seedRoot, sourceRoot };
}

function runHook(codexHome, hookEventName = "SessionStart") {
  const env = { ...process.env, CODEX_HOME: codexHome };
  delete env.LLM_SCRIPT_ROOT;

  return spawnSync(process.execPath, [hookScript], {
    encoding: "utf8",
    env,
    input: JSON.stringify({
      hook_event_name: hookEventName,
      source: "startup",
      cwd: codexHome
    }),
    stdio: ["pipe", "pipe", "pipe"]
  });
}

function temporaryRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "workbench-session-start-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test("does nothing when neither central source clone exists", (t) => {
  const root = temporaryRoot(t);
  const result = runHook(path.join(root, "codex-home"));

  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
});

test("fast-forwards existing LLM Script and Dev Wiki source clones", (t) => {
  const root = temporaryRoot(t);
  const codexHome = path.join(root, "codex-home");
  const llmSource = path.join(codexHome, "workbench", "llm-script", "source");
  const wikiSource = path.join(codexHome, "workbench", "dev-wiki", "source");
  createBehindClone(root, "llm-script", llmSource);
  createBehindClone(root, "dev-wiki", wikiSource);

  const result = runHook(codexHome);

  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
  assert.equal(fs.readFileSync(path.join(llmSource, "state.txt"), "utf8"), "latest\n");
  assert.equal(fs.readFileSync(path.join(wikiSource, "state.txt"), "utf8"), "latest\n");
});

test("warns and preserves a conflicting dirty worktree", (t) => {
  const root = temporaryRoot(t);
  const codexHome = path.join(root, "codex-home");
  const wikiSource = path.join(codexHome, "workbench", "dev-wiki", "source");
  createBehindClone(root, "dev-wiki", wikiSource);
  const before = git(["rev-parse", "HEAD"], wikiSource);
  write(path.join(wikiSource, "state.txt"), "local change\n");

  const result = runHook(codexHome);
  const output = JSON.parse(result.stdout);

  assert.equal(result.status, 0);
  assert.match(output.systemMessage, /Dev Wiki: fast-forward 최신화에 실패/);
  assert.equal(fs.readFileSync(path.join(wikiSource, "state.txt"), "utf8"), "local change\n");
  assert.equal(git(["rev-parse", "HEAD"], wikiSource), before);
});

test("warns and leaves a non-main Dev Wiki branch untouched", (t) => {
  const root = temporaryRoot(t);
  const codexHome = path.join(root, "codex-home");
  const wikiSource = path.join(codexHome, "workbench", "dev-wiki", "source");
  createBehindClone(root, "dev-wiki", wikiSource);
  git(["switch", "-c", "topic"], wikiSource);
  const before = git(["rev-parse", "HEAD"], wikiSource);

  const result = runHook(codexHome);
  const output = JSON.parse(result.stdout);

  assert.equal(result.status, 0);
  assert.match(output.systemMessage, /Dev Wiki: main 브랜치가 아니어서 최신화를 건너뛰었습니다/);
  assert.equal(git(["branch", "--show-current"], wikiSource), "topic");
  assert.equal(git(["rev-parse", "HEAD"], wikiSource), before);
  assert.equal(fs.readFileSync(path.join(wikiSource, "state.txt"), "utf8"), "initial\n");
});

test("warns and leaves Dev Wiki main with a different upstream untouched", (t) => {
  const root = temporaryRoot(t);
  const codexHome = path.join(root, "codex-home");
  const wikiSource = path.join(codexHome, "workbench", "dev-wiki", "source");
  createBehindClone(root, "dev-wiki", wikiSource);
  git(["branch", "--unset-upstream"], wikiSource);
  const before = git(["rev-parse", "HEAD"], wikiSource);

  const result = runHook(codexHome);
  const output = JSON.parse(result.stdout);

  assert.equal(result.status, 0);
  assert.match(output.systemMessage, /Dev Wiki: upstream이 origin\/main이 아니어서 최신화를 건너뛰었습니다/);
  assert.equal(git(["branch", "--show-current"], wikiSource), "main");
  assert.equal(git(["rev-parse", "HEAD"], wikiSource), before);
  assert.equal(fs.readFileSync(path.join(wikiSource, "state.txt"), "utf8"), "initial\n");
});

test("ignores non-SessionStart payloads", (t) => {
  const root = temporaryRoot(t);
  const codexHome = path.join(root, "codex-home");
  const llmSource = path.join(codexHome, "workbench", "llm-script", "source");
  createBehindClone(root, "llm-script", llmSource);

  const result = runHook(codexHome, "PostToolUse");

  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
  assert.equal(fs.readFileSync(path.join(llmSource, "state.txt"), "utf8"), "initial\n");
});
