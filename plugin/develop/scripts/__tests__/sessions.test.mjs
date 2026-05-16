import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  clearActivePlan,
  createSession,
  deleteSession,
  getActivePlan,
  loadSession,
  resolveSessionFile,
  setActivePlan,
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
  it("starts with null activePlan", () => {
    const s = loadSession(SESSION_ID);
    assert.equal(s.activePlan, null);
  });

  it("ignores unknown top-level keys on disk", () => {
    // parseSessionShape projects onto a fixed shape and never spreads the
    // parsed object, so anything we did not ask for falls away.
    const file = resolveSessionFile(SESSION_ID);
    fs.writeFileSync(
      file,
      JSON.stringify({
        sessionId: SESSION_ID,
        cwd: "/repo",
        somethingElse: { foo: 1 },
        anotherUnknown: [1, 2, 3],
        stopReviewThreadId: "legacy-thread-id",
      }),
      "utf8",
    );
    const s = loadSession(SESSION_ID);
    assert.equal(s.somethingElse, undefined);
    assert.equal(s.anotherUnknown, undefined);
    // stopReviewThreadId was removed when broker daemon went away; legacy
    // values on disk are silently dropped by parseSessionShape.
    assert.equal(s.stopReviewThreadId, undefined);
    assert.equal(s.activePlan, null);
  });
});

describe("setActivePlan / getActivePlan / clearActivePlan", () => {
  it("sets and reads back the slot", () => {
    setActivePlan(SESSION_ID, "plans/login/.runner-state.json");
    assert.equal(
      getActivePlan(SESSION_ID),
      "plans/login/.runner-state.json",
    );
  });

  it("is idempotent — setting the same pointer twice is a no-op", () => {
    setActivePlan(SESSION_ID, "plans/login/.runner-state.json");
    const before = fs.readFileSync(resolveSessionFile(SESSION_ID), "utf8");
    setActivePlan(SESSION_ID, "plans/login/.runner-state.json");
    const after = fs.readFileSync(resolveSessionFile(SESSION_ID), "utf8");
    assert.equal(before, after);
  });

  it("overwrites when given a different pointer (and the value flips)", () => {
    setActivePlan(SESSION_ID, "plans/login/.runner-state.json");
    setActivePlan(SESSION_ID, "plans/auth/.runner-state.json");
    assert.equal(
      getActivePlan(SESSION_ID),
      "plans/auth/.runner-state.json",
    );
  });

  it("normalizes separator style before comparing and storing", () => {
    setActivePlan(SESSION_ID, "plans\\login\\.runner-state.json");
    assert.equal(
      getActivePlan(SESSION_ID),
      "plans/login/.runner-state.json",
    );
  });

  it("clears the slot back to null", () => {
    setActivePlan(SESSION_ID, "plans/login/.runner-state.json");
    clearActivePlan(SESSION_ID);
    assert.equal(getActivePlan(SESSION_ID), null);
  });

  it("ignores empty / falsy pointers", () => {
    setActivePlan(SESSION_ID, "");
    setActivePlan(SESSION_ID, null);
    assert.equal(getActivePlan(SESSION_ID), null);
  });

  it("is a no-op for an unknown sessionId", () => {
    assert.doesNotThrow(() => {
      setActivePlan("no-such-session", "plans/x/.runner-state.json");
    });
    assert.equal(getActivePlan("no-such-session"), null);
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
