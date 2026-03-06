# Package Manager Rules

> This document covers only "judgment-required rules" that ESLint/Prettier cannot enforce.
> Mechanical rules are applied by `init-coding-rules` through conversational diff + approval based on this coding-rules folder.

---

**Use pnpm only. npm/yarn are prohibited.**

### preinstall guard

Add the following to `package.json` to block npm/yarn execution:

```json
"scripts": {
  "preinstall": "npx only-allow pnpm"
}
```

### .npmrc core settings

```ini
shamefully-hoist=false
strict-peer-dependencies=true
auto-install-peers=false
prefer-frozen-lockfile=true
```

### lockfile

`pnpm-lock.yaml` must always be committed to Git.





