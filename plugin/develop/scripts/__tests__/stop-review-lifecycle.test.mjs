import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  createSession,
  loadSession,
  addWorktree,
  setWorktreeStopReviewActive,
  resolveSessionFile,
} from "../lib/sessions.mjs";

const SESSION_ID = "stop-review-lifecycle-test-session";
const WORKTREE_PATH = path.join(os.tmpdir(), "stop-review-lifecycle-wt");

let prevPluginData;
let tmpPluginData;

before(() => {
  prevPluginData = process.env.CLAUDE_PLUGIN_DATA;
  tmpPluginData = fs.mkdtempSync(path.join(os.tmpdir(), "stop-review-lifecycle-"));
  process.env.CLAUDE_PLUGIN_DATA = tmpPluginData;
});

after(() => {
  if (prevPluginData === undefined) {
    delete process.env.CLAUDE_PLUGIN_DATA;
  } else {
    process.env.CLAUDE_PLUGIN_DATA = prevPluginData;
  }
  try {
    fs.rmSync(tmpPluginData, { recursive: true, force: true });
  } catch {
    // best-effort
  }
});

beforeEach(() => {
  // Reset session state between tests.
  try {
    fs.unlinkSync(resolveSessionFile(SESSION_ID));
  } catch {
    // ignore ENOENT
  }
  createSession(SESSION_ID, "/repo");
  addWorktree(SESSION_ID, WORKTREE_PATH, "feat/test");
});

describe("setWorktreeStopReviewActive", () => {
  it("sets pendingStopReview = true on the matching worktree", () => {
    setWorktreeStopReviewActive(SESSION_ID, WORKTREE_PATH, true);
    const session = loadSession(SESSION_ID);
    const wt = session.worktrees.find((w) => w.path.endsWith("stop-review-lifecycle-wt"));
    assert.equal(wt.pendingStopReview, true);
  });

  it("clears pendingStopReview to false", () => {
    setWorktreeStopReviewActive(SESSION_ID, WORKTREE_PATH, true);
    setWorktreeStopReviewActive(SESSION_ID, WORKTREE_PATH, false);
    const session = loadSession(SESSION_ID);
    const wt = session.worktrees.find((w) => w.path.endsWith("stop-review-lifecycle-wt"));
    assert.equal(wt.pendingStopReview, false);
  });

  it("coerces truthy/falsy values to boolean", () => {
    setWorktreeStopReviewActive(SESSION_ID, WORKTREE_PATH, 1);
    let session = loadSession(SESSION_ID);
    let wt = session.worktrees.find((w) => w.path.endsWith("stop-review-lifecycle-wt"));
    assert.equal(wt.pendingStopReview, true);

    setWorktreeStopReviewActive(SESSION_ID, WORKTREE_PATH, 0);
    session = loadSession(SESSION_ID);
    wt = session.worktrees.find((w) => w.path.endsWith("stop-review-lifecycle-wt"));
    assert.equal(wt.pendingStopReview, false);
  });

  it("is a no-op for an unknown worktree path", () => {
    setWorktreeStopReviewActive(SESSION_ID, "/no/such/worktree", true);
    const session = loadSession(SESSION_ID);
    const wt = session.worktrees.find((w) => w.path.endsWith("stop-review-lifecycle-wt"));
    // The registered worktree is untouched.
    assert.notEqual(wt.pendingStopReview, true);
  });

  it("is a no-op for an unknown sessionId", () => {
    assert.doesNotThrow(() => {
      setWorktreeStopReviewActive("no-such-session", WORKTREE_PATH, true);
    });
  });

  it("starts undefined on a freshly registered worktree (gate skips by default)", () => {
    const session = loadSession(SESSION_ID);
    const wt = session.worktrees.find((w) => w.path.endsWith("stop-review-lifecycle-wt"));
    assert.equal(wt.pendingStopReview, undefined);
    // The Stop hook treats undefined as falsy → worktree is skipped, which is
    // the desired default for non-plan-runner worktrees.
  });
});
