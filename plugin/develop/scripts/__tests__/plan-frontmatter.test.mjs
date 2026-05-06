import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  extractRunnerHeaders,
  readPlanFrontmatter,
} from "../lib/plan-frontmatter.mjs";

let tmpDir;

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "plan-frontmatter-test-"));
});

after(() => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
});

function writePlan(name, contents) {
  const file = path.join(tmpDir, name);
  fs.writeFileSync(file, contents, "utf8");
  return file;
}

describe("readPlanFrontmatter", () => {
  it("parses a normal frontmatter block", () => {
    const file = writePlan(
      "ok.plan.md",
      `---
plan_slug: login-frontend
branch: feat/login-frontend
owner_agent: frontend-developer
---

# body`,
    );
    const { headers, bodyOffsetLine } = readPlanFrontmatter(file);
    assert.equal(headers.plan_slug, "login-frontend");
    assert.equal(headers.branch, "feat/login-frontend");
    assert.equal(headers.owner_agent, "frontend-developer");
    assert.ok(bodyOffsetLine > 0);
  });

  it("strips surrounding quotes from values", () => {
    const file = writePlan(
      "quoted.plan.md",
      `---
plan_slug: "my-slug"
branch: 'feat/x'
owner_agent: agent
---
`,
    );
    const { headers } = readPlanFrontmatter(file);
    assert.equal(headers.plan_slug, "my-slug");
    assert.equal(headers.branch, "feat/x");
  });

  it("ignores blank lines and # comments inside the block", () => {
    const file = writePlan(
      "comments.plan.md",
      `---

# this is a comment
plan_slug: x

branch: feat/x
owner_agent: a
---
`,
    );
    const { headers } = readPlanFrontmatter(file);
    assert.equal(headers.plan_slug, "x");
  });

  it("rejects a file without a fence", () => {
    const file = writePlan("nofence.md", "# just markdown\n");
    assert.throws(() => readPlanFrontmatter(file), /missing the YAML frontmatter/);
  });

  it("rejects an unclosed fence", () => {
    const file = writePlan(
      "open.plan.md",
      `---
plan_slug: x
branch: feat/x
owner_agent: a
`,
    );
    assert.throws(() => readPlanFrontmatter(file), /not closed/);
  });

  it("rejects a malformed line missing a colon", () => {
    const file = writePlan(
      "bad.plan.md",
      `---
plan_slug x
---
`,
    );
    assert.throws(() => readPlanFrontmatter(file), /Each entry must be/);
  });

  it("rejects a missing file with a clear message", () => {
    assert.throws(() => readPlanFrontmatter(path.join(tmpDir, "missing.plan.md")), /not found/);
  });
});

describe("extractRunnerHeaders", () => {
  it("returns the three required fields", () => {
    const out = extractRunnerHeaders("/p/x.plan.md", {
      plan_slug: "x",
      branch: "feat/x",
      owner_agent: "a",
    });
    assert.deepEqual(out, { planSlug: "x", branch: "feat/x", ownerAgent: "a" });
  });

  it("lists all missing fields in one error", () => {
    assert.throws(
      () => extractRunnerHeaders("/p/x.plan.md", {}),
      /plan_slug, branch, owner_agent/,
    );
  });

  it("rejects slugs that would corrupt on-disk paths", () => {
    assert.throws(
      () => extractRunnerHeaders("/p/x.plan.md", {
        plan_slug: "../escape",
        branch: "feat/x",
        owner_agent: "a",
      }),
      /plan_slug/,
    );
  });

  it("accepts dots, underscores, hyphens, and digits in slugs", () => {
    const out = extractRunnerHeaders("/p/x.plan.md", {
      plan_slug: "auth_v2.1-final",
      branch: "feat/x",
      owner_agent: "a",
    });
    assert.equal(out.planSlug, "auth_v2.1-final");
  });
});
