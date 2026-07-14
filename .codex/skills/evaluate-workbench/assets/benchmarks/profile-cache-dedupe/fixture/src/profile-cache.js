export function createProfileCache({ fetchProfile, ttlMs = 60_000, now = Date.now }) {
  const cache = new Map();

  return {
    async get(userId) {
      const cached = cache.get(userId);
      if (cached && cached.expiresAt > now()) {
        return cached.value;
      }

      const value = await fetchProfile(userId);
      cache.set(userId, {
        value,
        expiresAt: now() + ttlMs,
      });
      return value;
    },

    clear(userId) {
      if (userId === undefined) {
        cache.clear();
        return;
      }
      cache.delete(userId);
    },
  };
}
