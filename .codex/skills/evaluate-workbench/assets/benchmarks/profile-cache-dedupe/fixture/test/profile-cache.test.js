import assert from "node:assert/strict";
import test from "node:test";

import { createProfileCache } from "../src/profile-cache.js";

test("caches a successful profile until the TTL expires", async () => {
  let clock = 1_000;
  let calls = 0;
  const cache = createProfileCache({
    fetchProfile: async (userId) => {
      calls += 1;
      return { id: userId, revision: calls };
    },
    ttlMs: 100,
    now: () => clock,
  });

  assert.deepEqual(await cache.get("user-1"), { id: "user-1", revision: 1 });
  assert.deepEqual(await cache.get("user-1"), { id: "user-1", revision: 1 });
  assert.equal(calls, 1);

  clock += 101;
  assert.deepEqual(await cache.get("user-1"), { id: "user-1", revision: 2 });
  assert.equal(calls, 2);
});

test("clear invalidates one user without evicting another", async () => {
  const calls = new Map();
  const cache = createProfileCache({
    fetchProfile: async (userId) => {
      const next = (calls.get(userId) ?? 0) + 1;
      calls.set(userId, next);
      return { id: userId, revision: next };
    },
  });

  await cache.get("user-1");
  await cache.get("user-2");
  cache.clear("user-1");

  assert.deepEqual(await cache.get("user-1"), { id: "user-1", revision: 2 });
  assert.deepEqual(await cache.get("user-2"), { id: "user-2", revision: 1 });
});
