import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, realpathSync } from "node:fs";

export const DEV_WIKI_BRANCH = "main";

const GIT_TIMEOUT_MS = 20_000;

export function normalizeRemote(value) {
  return String(value || "").trim().replace(/\/$/, "").replace(/\.git$/, "");
}

function runGit(sourceRoot, args) {
  const result = spawnSync("git", ["-C", sourceRoot, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: "0"
    },
    stdio: ["ignore", "pipe", "pipe"],
    timeout: GIT_TIMEOUT_MS,
    windowsHide: true
  });

  if (result.error?.code === "ETIMEDOUT") {
    throw new Error(`Dev wiki Git command timed out: git ${args.join(" ")}`);
  }
  if (result.error || result.status !== 0) {
    const detail = [
      result.error?.message,
      result.stderr?.trim(),
      result.stdout?.trim()
    ].filter(Boolean).join("\n");
    throw new Error(`git ${args.join(" ")} failed${detail ? `:\n${detail}` : ""}`);
  }

  return result.stdout.trim();
}

function assertRepositoryRoot(sourceRoot) {
  if (!existsSync(sourceRoot) || !lstatSync(sourceRoot).isDirectory()) {
    throw new Error(`Dev wiki source root not found: ${sourceRoot}`);
  }

  const topLevel = runGit(sourceRoot, ["rev-parse", "--show-toplevel"]);
  if (realpathSync(topLevel) !== realpathSync(sourceRoot)) {
    throw new Error(`Dev wiki source path is not the Git repository root: ${sourceRoot}`);
  }
}

export function inspectDevWikiSource({ sourceRoot, repo, requireClean = true }) {
  assertRepositoryRoot(sourceRoot);

  const remote = runGit(sourceRoot, ["remote", "get-url", "origin"]);
  if (normalizeRemote(remote) !== normalizeRemote(repo)) {
    throw new Error(`Dev wiki origin mismatch. Expected ${repo}, found ${remote}`);
  }

  const branch = runGit(sourceRoot, ["branch", "--show-current"]);
  if (branch !== DEV_WIKI_BRANCH) {
    throw new Error(
      `Dev wiki branch mismatch. Expected ${DEV_WIKI_BRANCH}, found ${branch || "detached HEAD"}. ` +
      "Do not switch branches automatically."
    );
  }

  const upstream = runGit(sourceRoot, [
    "rev-parse",
    "--abbrev-ref",
    "--symbolic-full-name",
    "@{upstream}"
  ]);
  const expectedUpstream = `origin/${DEV_WIKI_BRANCH}`;
  if (upstream !== expectedUpstream) {
    throw new Error(`Dev wiki upstream mismatch. Expected ${expectedUpstream}, found ${upstream}`);
  }

  const status = runGit(sourceRoot, ["status", "--porcelain"]);
  if (requireClean && status) {
    throw new Error(
      `Dev wiki source has local changes. Resolve them before refreshing:\n${status}`
    );
  }

  return {
    branch,
    remote,
    status,
    upstream,
    head: runGit(sourceRoot, ["rev-parse", "HEAD"])
  };
}

export function refreshDevWikiSource({ sourceRoot, repo, quiet = false }) {
  const before = inspectDevWikiSource({ sourceRoot, repo, requireClean: true });
  const pullArgs = [
    "-c",
    "credential.interactive=never",
    "-c",
    "pull.rebase=false",
    "pull",
    "--ff-only"
  ];
  if (quiet) pullArgs.push("--quiet");
  pullArgs.push("origin", DEV_WIKI_BRANCH);

  const output = runGit(sourceRoot, pullArgs);
  const after = inspectDevWikiSource({ sourceRoot, repo, requireClean: true });
  const remoteHead = runGit(sourceRoot, ["rev-parse", `origin/${DEV_WIKI_BRANCH}`]);

  if (after.head !== remoteHead) {
    throw new Error(
      `Dev wiki ${DEV_WIKI_BRANCH} is not identical to origin/${DEV_WIKI_BRANCH} after pull. ` +
      "Resolve local commits before updating the wiki."
    );
  }

  return {
    beforeHead: before.head,
    head: after.head,
    output,
    updated: before.head !== after.head
  };
}
