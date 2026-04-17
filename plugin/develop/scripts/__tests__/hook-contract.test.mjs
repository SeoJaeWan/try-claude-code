import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildPhaseDescription,
  buildWorktreePromptHeader,
  PHASE_DESC_RE,
  SOFT_PHASE_HINT_RE,
  SOFT_WORKTREE_PATH_HINT_RE,
  WORKTREE_ADD_RE,
  WORKTREE_PATH_RE,
  WORKTREE_REMOVE_RE,
} from "../lib/contract.mjs";
import {
  absoluteNormalizePath,
  comparePaths,
  normalizePath,
  toPosixPath,
} from "../lib/fs.mjs";

// ---------------------------------------------------------------------------
// contract.mjs — builder + regex round-trips
// ---------------------------------------------------------------------------

describe("buildPhaseDescription ↔ PHASE_DESC_RE round-trip", () => {
  it("extracts the number that was built in", () => {
    for (const n of [1, 3, 10, 42, 100]) {
      const desc = buildPhaseDescription(n, "placeholder summary");
      const match = desc.match(PHASE_DESC_RE);
      assert.ok(match, `no match for built description: ${desc}`);
      assert.equal(Number(match[1]), n);
    }
  });

  it("tolerates case variations in the literal word Phase", () => {
    assert.ok("PHASE 7: foo".match(PHASE_DESC_RE));
    assert.ok("phase 7: foo".match(PHASE_DESC_RE));
  });

  it("rejects drift forms that would silently break the hook", () => {
    for (const drift of [
      "[Phase 1] impl",       // bracket prefix
      "1단계: 로그인 구현",    // Korean numeral
      "Step 3: add",          // different noun
      " Phase 5: leading ws",  // leading whitespace (anchor fails)
    ]) {
      assert.equal(drift.match(PHASE_DESC_RE), null, `should NOT match: ${drift}`);
    }
  });
});

describe("buildWorktreePromptHeader ↔ WORKTREE_PATH_RE round-trip", () => {
  it("extracts the path that was built in", () => {
    for (const p of [
      "/repo/worktrees/task-a",
      "C:/Users/test/worktrees/x",
      "./worktrees/task-with-dashes",
    ]) {
      const header = buildWorktreePromptHeader(p);
      const match = header.match(WORKTREE_PATH_RE);
      assert.ok(match, `no match for: ${header}`);
      assert.equal(match[1], p);
    }
  });

  it("rejects drift forms that reword the header", () => {
    for (const drift of [
      "## Working directory\nWork directory: /repo/x",
      "## Working directory\n작업 디렉토리: /repo/x",
      "## Working directory\nYou're working in: /repo/x",
    ]) {
      assert.equal(drift.match(WORKTREE_PATH_RE), null, `should NOT match: ${drift}`);
    }
  });
});

describe("WORKTREE_ADD_RE", () => {
  it("parses a basic add", () => {
    const m = "git worktree add -b task-a worktrees/task-a main".match(WORKTREE_ADD_RE);
    assert.ok(m);
    assert.equal(m[2], "task-a");
    assert.equal(m[3], "worktrees/task-a");
  });

  it("parses a -C prefixed add", () => {
    const m = "git -C /repo worktree add -b feat/x worktrees/feat-x".match(WORKTREE_ADD_RE);
    assert.ok(m);
    assert.equal(m[1], "/repo");
    assert.equal(m[2], "feat/x");
    assert.equal(m[3], "worktrees/feat-x");
  });

  it("parses an add without -b branch", () => {
    const m = "git worktree add worktrees/existing".match(WORKTREE_ADD_RE);
    assert.ok(m);
    assert.equal(m[2], undefined);
    assert.equal(m[3], "worktrees/existing");
  });
});

describe("WORKTREE_REMOVE_RE", () => {
  it("parses a basic remove", () => {
    const m = "git worktree remove worktrees/task-a".match(WORKTREE_REMOVE_RE);
    assert.ok(m);
    assert.equal(m[2], "worktrees/task-a");
  });

  it("parses a remove --force", () => {
    const m = "git worktree remove --force worktrees/task-a".match(WORKTREE_REMOVE_RE);
    assert.ok(m);
    assert.equal(m[2], "worktrees/task-a");
  });
});

describe("soft hints catch drift that the strict regex misses", () => {
  it("flags phase-ish descriptions that fail PHASE_DESC_RE", () => {
    const drift = "[Phase 1] impl login";
    assert.equal(drift.match(PHASE_DESC_RE), null);
    assert.ok(SOFT_PHASE_HINT_RE.test(drift));
  });

  it("flags worktree-path-ish prompts that fail WORKTREE_PATH_RE", () => {
    const drift = "## Working directory\nWork directory: /repo/x";
    assert.equal(drift.match(WORKTREE_PATH_RE), null);
    assert.ok(SOFT_WORKTREE_PATH_HINT_RE.test(drift));
  });
});

// ---------------------------------------------------------------------------
// fs.mjs — path utilities
// ---------------------------------------------------------------------------

describe("toPosixPath", () => {
  it("converts Windows separators", () => {
    assert.equal(toPosixPath(String.raw`C:\Users\x\y`), "C:/Users/x/y");
  });

  it("leaves POSIX paths unchanged", () => {
    assert.equal(toPosixPath("/a/b/c"), "/a/b/c");
  });

  it("returns empty for falsy input", () => {
    assert.equal(toPosixPath(""), "");
    assert.equal(toPosixPath(null), "");
    assert.equal(toPosixPath(undefined), "");
  });
});

describe("normalizePath", () => {
  it("collapses ./ segments and converts separators", () => {
    assert.equal(normalizePath("./a/b/../c"), "a/c");
  });

  it("keeps absolute paths absolute without resolving", () => {
    const out = normalizePath("/abs/./path");
    assert.equal(out, "/abs/path");
  });
});

describe("absoluteNormalizePath", () => {
  it("produces an absolute POSIX path", () => {
    const out = absoluteNormalizePath(".");
    assert.ok(out.length > 0);
    assert.ok(!out.includes("\\"));
  });
});

describe("comparePaths", () => {
  it("treats identical paths as equal", () => {
    assert.equal(comparePaths("/a/b", "/a/b"), true);
  });

  it("treats equivalent paths as equal regardless of separator", () => {
    assert.equal(
      comparePaths(String.raw`C:\Users\x`, "C:/Users/x"),
      true,
    );
  });

  it("distinguishes different paths", () => {
    assert.equal(comparePaths("/a/b", "/a/c"), false);
  });

  it("handles empty inputs symmetrically", () => {
    assert.equal(comparePaths("", ""), true);
    assert.equal(comparePaths("", "/a"), false);
  });
});
