import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  absoluteNormalizePath,
  comparePaths,
  normalizePath,
  toPosixPath,
} from "../lib/fs.mjs";

// Path utility tests, formerly bundled with the contract-regex tests in
// hook-contract.test.mjs. The contract regexes were retired with the move to
// the runner-state JSON SSOT, so only the path helpers remain here.

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
