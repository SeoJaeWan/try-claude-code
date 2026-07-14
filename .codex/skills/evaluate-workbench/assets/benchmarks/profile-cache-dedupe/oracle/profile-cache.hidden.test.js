import assert from "node:assert/strict";
import test from "node:test";

import { createProfileCache } from "../src/profile-cache.js";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

test("deduplicates simultaneous requests for the same user", async () => {
  const request = deferred();
  let calls = 0;
  const cache = createProfileCache({
    fetchProfile: async () => {
      calls += 1;
      return request.promise;
    },
  });

  const first = cache.get("user-1");
  const second = cache.get("user-1");
  assert.equal(calls, 1);

  request.resolve({ id: "user-1", name: "Ada" });
  assert.deepEqual(await first, { id: "user-1", name: "Ada" });
  assert.deepEqual(await second, { id: "user-1", name: "Ada" });
  assert.equal(calls, 1);
});

test("keeps simultaneous requests for different users independent", async () => {
  const requests = new Map();
  let calls = 0;
  const cache = createProfileCache({
    fetchProfile: async (userId) => {
      calls += 1;
      const request = deferred();
      requests.set(userId, request);
      return request.promise;
    },
  });

  const first = cache.get("user-1");
  const second = cache.get("user-2");
  assert.equal(calls, 2);

  requests.get("user-2").resolve({ id: "user-2" });
  requests.get("user-1").resolve({ id: "user-1" });
  assert.deepEqual(await first, { id: "user-1" });
  assert.deepEqual(await second, { id: "user-2" });
});

test("shares a rejection but retries after the failed request settles", async () => {
  const firstRequest = deferred();
  let calls = 0;
  const cache = createProfileCache({
    fetchProfile: async (userId) => {
      calls += 1;
      if (calls === 1) return firstRequest.promise;
      return { id: userId, recovered: true };
    },
  });

  const first = cache.get("user-1");
  const second = cache.get("user-1");
  assert.equal(calls, 1);

  firstRequest.reject(new Error("network unavailable"));
  await assert.rejects(first, /network unavailable/);
  await assert.rejects(second, /network unavailable/);

  assert.deepEqual(await cache.get("user-1"), { id: "user-1", recovered: true });
  assert.equal(calls, 2);
});

test("preserves successful TTL caching while deduplicating", async () => {
  let clock = 5_000;
  let calls = 0;
  const cache = createProfileCache({
    fetchProfile: async (userId) => {
      calls += 1;
      return { id: userId, revision: calls };
    },
    ttlMs: 50,
    now: () => clock,
  });

  const [first, second] = await Promise.all([cache.get("user-1"), cache.get("user-1")]);
  assert.deepEqual(first, { id: "user-1", revision: 1 });
  assert.deepEqual(second, first);
  assert.deepEqual(await cache.get("user-1"), first);
  assert.equal(calls, 1);

  clock += 51;
  assert.deepEqual(await cache.get("user-1"), { id: "user-1", revision: 2 });
  assert.equal(calls, 2);
});
