import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  addActivePlanState,
  createSession,
  deleteSession,
  getStopReviewThreadId,
  listActivePlanStates,
  loadSession,
  removeActivePlanState,
  resolveSessionFile,
  setStopReviewThreadId,
} from "../lib/sessions.mjs";

const SESSION_ID = "sessions-test-session";

let prevPluginData;
let tmpPluginData;

before(() => {
  prevPluginData = process.env.CLAUDE_PLUGIN_DATA;
  tmpPluginData = fs.mkdtempSync(path.join(os.tmpdir(), "sessions-test-"));
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
  try {
    fs.unlinkSync(resolveSessionFile(SESSION_ID));
  } catch {
    // ignore ENOENT
  }
  createSession(SESSION_ID, "/repo");
});

describe("createSession / loadSession", () => {
  it("starts with empty activePlanStates and null thread id", () => {
    const s = loadSession(SESSION_ID);
    assert.deepEqual(s.activePlanStates, []);
    assert.equal(s.stopReviewThreadId, null);
  });

  it("loads legacy files but drops removed fields silently", () => {
    // Hand-craft a legacy file mimicking the previous schema.
    const file = resolveSessionFile(SESSION_ID);
    fs.writeFileSync(
      file,
      JSON.stringify({
        sessionId: SESSION_ID,
        createdAt: new Date().toISOString(),
        cwd: "/repo",
        worktrees: [{ path: "/repo/worktrees/old", branch: "feat/old" }],
        blockHistory: [{ fingerprint: "abc", count: 1 }],
        stopReviewThreadId: "thread-123",
      }),
      "utf8",
    );
    const s = loadSession(SESSION_ID);
    // Removed fields are not surfaced.
    assert.equal(s.worktrees, undefined);
    assert.equal(s.blockHistory, undefined);
    // Retained fields survive.
    assert.equal(s.stopReviewThreadId, "thread-123");
    // New field defaults to empty array.
    assert.deepEqual(s.activePlanStates, []);
  });
});

describe("addActivePlanState / removeActivePlanState / listActivePlanStates", () => {
  it("adds and lists pointers", () => {
    addActivePlanState(SESSION_ID, "plans/login/.runner-state.json");
    addActivePlanState(SESSION_ID, "plans/auth/.runner-state.json");
    const list = listActivePlanStates(SESSION_ID);
    assert.equal(list.length, 2);
    assert.ok(list.some((p) => p.endsWith("plans/login/.runner-state.json")));
  });

  it("is idempotent — adding the same pointer twice is a no-op", () => {
    addActivePlanState(SESSION_ID, "plans/login/.runner-state.json");
    addActivePlanState(SESSION_ID, "plans/login/.runner-state.json");
    assert.equal(listActivePlanStates(SESSION_ID).length, 1);
  });

  it("removes pointers regardless of separator style", () => {
    addActivePlanState(SESSION_ID, "plans/login/.runner-state.json");
    removeActivePlanState(SESSION_ID, "plans\\login\\.runner-state.json");
    assert.deepEqual(listActivePlanStates(SESSION_ID), []);
  });

  it("ignores empty / falsy pointers", () => {
    addActivePlanState(SESSION_ID, "");
    addActivePlanState(SESSION_ID, null);
    assert.deepEqual(listActivePlanStates(SESSION_ID), []);
  });

  it("is a no-op for an unknown sessionId", () => {
    assert.doesNotThrow(() => {
      addActivePlanState("no-such-session", "plans/x/.runner-state.json");
    });
  });
});

describe("stopReviewThreadId reuse", () => {
  it("round-trips a thread id within the same session", () => {
    setStopReviewThreadId(SESSION_ID, "thread-xyz");
    assert.equal(getStopReviewThreadId(SESSION_ID), "thread-xyz");
  });

  it("returns null for unknown sessions", () => {
    assert.equal(getStopReviewThreadId("nope"), null);
  });
});

describe("deleteSession", () => {
  it("removes the file", () => {
    deleteSession(SESSION_ID);
    assert.equal(fs.existsSync(resolveSessionFile(SESSION_ID)), false);
  });

  it("is silent when the file does not exist", () => {
    deleteSession(SESSION_ID);
    assert.doesNotThrow(() => deleteSession(SESSION_ID));
  });
});
