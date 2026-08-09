import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const scriptsRoot = path.resolve(testDirectory, "..");
const refreshScript = path.join(scriptsRoot, "refresh-dev-wiki.mjs");
const stageScript = path.join(scriptsRoot, "stage-dev-wiki.mjs");

function run(command, args, cwd) {
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function runChecked(command, args, cwd) {
  const result = run(command, args, cwd);
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
  return runChecked("git", args, cwd);
}

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function temporaryRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dev-wiki-sync-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function createRemote(root) {
  const remoteRoot = path.join(root, "remote.git");
  const seedRoot = path.join(root, "seed");

  git(["init", "--bare", "--initial-branch=main", remoteRoot], root);
  git(["clone", remoteRoot, seedRoot], root);
  git(["config", "user.name", "Dev Wiki Test"], seedRoot);
  git(["config", "user.email", "dev-wiki@example.com"], seedRoot);
  write(path.join(seedRoot, "state.txt"), "initial\n");
  git(["add", "state.txt"], seedRoot);
  git(["commit", "-m", "initial"], seedRoot);
  git(["push", "-u", "origin", "main"], seedRoot);

  git(["switch", "-c", "topic"], seedRoot);
  write(path.join(seedRoot, "topic.txt"), "topic\n");
  git(["add", "topic.txt"], seedRoot);
  git(["commit", "-m", "topic"], seedRoot);
  git(["push", "-u", "origin", "topic"], seedRoot);
  git(["switch", "main"], seedRoot);

  return { remoteRoot, seedRoot };
}

function cloneDevWiki(root, remoteRoot) {
  const devWikiRoot = path.join(root, "dev-wiki");
  const sourceRoot = path.join(devWikiRoot, "source");
  fs.mkdirSync(devWikiRoot, { recursive: true });
  write(
    path.join(devWikiRoot, "config.json"),
    `${JSON.stringify({ repo: remoteRoot, branch: "main" }, null, 2)}\n`
  );
  git(["clone", "--branch", "main", remoteRoot, sourceRoot], root);
  return { devWikiRoot, sourceRoot };
}

function pushMainUpdate(seedRoot) {
  write(path.join(seedRoot, "state.txt"), "latest\n");
  git(["add", "state.txt"], seedRoot);
  git(["commit", "-m", "latest"], seedRoot);
  git(["push"], seedRoot);
}

test("refresh fast-forwards clean main and ends identical to origin/main", (t) => {
  const root = temporaryRoot(t);
  const { remoteRoot, seedRoot } = createRemote(root);
  const { devWikiRoot, sourceRoot } = cloneDevWiki(root, remoteRoot);
  pushMainUpdate(seedRoot);

  const result = run(process.execPath, [
    refreshScript,
    "--dev-wiki-root",
    devWikiRoot
  ], root);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Dev wiki main fast-forwarded/);
  assert.equal(fs.readFileSync(path.join(sourceRoot, "state.txt"), "utf8"), "latest\n");
  assert.equal(git(["rev-parse", "HEAD"], sourceRoot), git(["rev-parse", "origin/main"], sourceRoot));
  assert.equal(git(["status", "--porcelain"], sourceRoot), "");
});

test("refresh rejects a non-main checkout without switching it", (t) => {
  const root = temporaryRoot(t);
  const { remoteRoot } = createRemote(root);
  const { devWikiRoot, sourceRoot } = cloneDevWiki(root, remoteRoot);
  git(["switch", "-c", "local-topic"], sourceRoot);
  const before = git(["rev-parse", "HEAD"], sourceRoot);

  const result = run(process.execPath, [
    refreshScript,
    "--dev-wiki-root",
    devWikiRoot
  ], root);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Dev wiki branch mismatch\. Expected main, found local-topic/);
  assert.equal(git(["branch", "--show-current"], sourceRoot), "local-topic");
  assert.equal(git(["rev-parse", "HEAD"], sourceRoot), before);
});

test("refresh rejects dirty main before pulling", (t) => {
  const root = temporaryRoot(t);
  const { remoteRoot, seedRoot } = createRemote(root);
  const { devWikiRoot, sourceRoot } = cloneDevWiki(root, remoteRoot);
  pushMainUpdate(seedRoot);
  const before = git(["rev-parse", "HEAD"], sourceRoot);
  write(path.join(sourceRoot, "state.txt"), "local\n");

  const result = run(process.execPath, [
    refreshScript,
    "--dev-wiki-root",
    devWikiRoot
  ], root);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Dev wiki source has local changes/);
  assert.equal(fs.readFileSync(path.join(sourceRoot, "state.txt"), "utf8"), "local\n");
  assert.equal(git(["rev-parse", "HEAD"], sourceRoot), before);
});

test("setup clones only main and writes a main-only config", (t) => {
  const root = temporaryRoot(t);
  const { remoteRoot } = createRemote(root);
  const workspaceRoot = path.join(root, "workspace");
  const devWikiRoot = path.join(root, "dev-wiki");
  fs.mkdirSync(workspaceRoot);

  const result = run(process.execPath, [
    stageScript,
    "--workspace-root",
    workspaceRoot,
    "--dev-wiki-root",
    devWikiRoot,
    "--project",
    "sample",
    "--repo",
    remoteRoot
  ], root);

  assert.equal(result.status, 0, result.stderr);
  const sourceRoot = path.join(devWikiRoot, "source");
  const config = JSON.parse(fs.readFileSync(path.join(devWikiRoot, "config.json"), "utf8"));
  assert.equal(config.branch, "main");
  assert.equal(git(["branch", "--show-current"], sourceRoot), "main");
  assert.doesNotMatch(git(["branch", "--remotes"], sourceRoot), /origin\/topic/);
});

test("setup rejects a branch override other than main", (t) => {
  const root = temporaryRoot(t);
  const { remoteRoot } = createRemote(root);
  const workspaceRoot = path.join(root, "workspace");
  const devWikiRoot = path.join(root, "dev-wiki");
  fs.mkdirSync(workspaceRoot);

  const result = run(process.execPath, [
    stageScript,
    "--workspace-root",
    workspaceRoot,
    "--dev-wiki-root",
    devWikiRoot,
    "--project",
    "sample",
    "--repo",
    remoteRoot,
    "--branch",
    "topic"
  ], root);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Dev wiki branch is fixed to main; received topic/);
  assert.equal(fs.existsSync(path.join(devWikiRoot, "source")), false);
});
