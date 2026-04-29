import { spawnSync } from "node:child_process";

function run(cwd, args, { allowFail = false } = {}) {
  const result = spawnSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0 && !allowFail) {
    const err = new Error(
      `git ${args.join(" ")} failed (exit ${result.status}): ${result.stderr.trim()}`,
    );
    err.exitCode = 3;
    throw err;
  }
  return result;
}

export function revParseHead(cwd) {
  return run(cwd, ["rev-parse", "HEAD"]).stdout.trim();
}

export function currentBranch(cwd) {
  return run(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]).stdout.trim();
}

export function revParseSilent(cwd, ref) {
  const result = run(cwd, ["rev-parse", "--verify", ref], { allowFail: true });
  return result.status === 0 ? result.stdout.trim() : null;
}

const NUL = "\x1F";

export function listCommits(cwd, base, head) {
  const fmt = ["%H", "%s", "%b", "%an", "%ae", "%aI"].join(NUL);
  const sep = "\x1EEND_OF_COMMIT\x1E";
  const result = run(cwd, [
    "log",
    "--reverse",
    `--format=${fmt}${sep}`,
    `${base}..${head}`,
  ]);
  const out = result.stdout;
  if (!out.trim()) return [];
  return out
    .split(sep)
    .map((chunk) => chunk.replace(/^\n+/, ""))
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => {
      const [sha, subject, body, author, email, iso] = chunk.split(NUL);
      return {
        sha: (sha || "").trim(),
        subject: subject || "",
        body: (body || "").trim(),
        author: author || "",
        authorEmail: email || "",
        timestamp: iso || "",
      };
    })
    .filter((commit) => commit.sha.length === 40);
}

export function commitParent(cwd, sha) {
  const result = run(cwd, ["rev-parse", `${sha}^`], { allowFail: true });
  if (result.status === 0) return result.stdout.trim();
  // Root commit — compare against the empty tree so diffs still work.
  return "4b825dc642cb6eb9a060e54bf899d15006ef9a21";
}

export function commitNumstat(cwd, sha) {
  const result = run(cwd, ["show", "--format=", "--numstat", sha]);
  const lines = result.stdout.split(/\r?\n/).filter(Boolean);
  const entries = [];
  for (const line of lines) {
    const parts = line.split("\t");
    if (parts.length < 3) continue;
    const [addRaw, delRaw, pathRaw] = parts;
    const additions = addRaw === "-" ? 0 : Number.parseInt(addRaw, 10) || 0;
    const deletions = delRaw === "-" ? 0 : Number.parseInt(delRaw, 10) || 0;
    entries.push({
      additions,
      deletions,
      rawPath: pathRaw,
      rawAdditions: addRaw,
      rawDeletions: delRaw,
    });
  }
  return entries;
}

export function commitNameStatus(cwd, sha) {
  const result = run(cwd, ["show", "--format=", "--name-status", sha]);
  const lines = result.stdout.split(/\r?\n/).filter(Boolean);
  const entries = [];
  for (const line of lines) {
    const parts = line.split("\t");
    const code = parts[0];
    if (!code) continue;
    if (code.startsWith("R") || code.startsWith("C")) {
      entries.push({ kind: "renamed", oldPath: parts[1], path: parts[2] });
    } else if (code === "A") {
      entries.push({ kind: "added", path: parts[1] });
    } else if (code === "M") {
      entries.push({ kind: "modified", path: parts[1] });
    } else if (code === "D") {
      entries.push({ kind: "deleted", path: parts[1] });
    } else {
      entries.push({ kind: "modified", path: parts[1] });
    }
  }
  return entries;
}

export function commitDiff(cwd, parent, sha) {
  return run(cwd, ["diff", `${parent}..${sha}`]).stdout;
}

export function rangeNameStatus(cwd, base, head) {
  const result = run(cwd, ["diff", "--name-status", `${base}..${head}`]);
  const lines = result.stdout.split(/\r?\n/).filter(Boolean);
  return lines.map((line) => {
    const parts = line.split("\t");
    const code = parts[0];
    if (code.startsWith("R") || code.startsWith("C")) {
      return { kind: "renamed", path: parts[2], oldPath: parts[1] };
    }
    const mapping = { A: "added", M: "modified", D: "deleted" };
    return { kind: mapping[code] || "modified", path: parts[1] };
  });
}

export function rangeNumstat(cwd, base, head) {
  const result = run(cwd, ["diff", "--numstat", `${base}..${head}`]);
  const lines = result.stdout.split(/\r?\n/).filter(Boolean);
  return lines.map((line) => {
    const [addRaw, delRaw, pathRaw] = line.split("\t");
    return {
      additions: addRaw === "-" ? 0 : Number.parseInt(addRaw, 10) || 0,
      deletions: delRaw === "-" ? 0 : Number.parseInt(delRaw, 10) || 0,
      path: pathRaw,
    };
  });
}

export function fileContentAt(cwd, ref, path) {
  const result = run(cwd, ["show", `${ref}:${path}`], { allowFail: true });
  if (result.status !== 0) return null;
  return result.stdout;
}
