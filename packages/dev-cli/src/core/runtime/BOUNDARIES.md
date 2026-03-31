# core/runtime — Package-Owned Contract Boundaries

Phase 1 산출물. 이후 phase가 rebaseline하는 thin runtime target 정의.

---

## Target directory layout (goal for Phase 2–4)

```
src/core/
  cli/           parse, route, output, error  (retained, profile-free)
  runtime/       manifest types, loader, dispatcher, help-builder  (new)
  executors/     file-generator, spec-normalizer, template-engine, file-writer  (retained)
  shared/        path-utils, recipe-utils, naming, path-patterns  (retained)
  validation/    validate-file, profile-validator  (retained; profile-validator removable after Phase 4)
  profiles/      [OBSOLETE — remove in Phase 4]
  execution/     [merge into executors/ in Phase 4]
  docs/          [merge into runtime/ in Phase 4]
```

---

## Retained capabilities (유지)

| Module | Location | Notes |
|--------|----------|-------|
| argv parser | `cli/arg-parser.mjs` | profile-free |
| output formatter | `cli/output.mjs` | JSON-only |
| error formatter | `cli/error-formatter.mjs` | JSON-only |
| file-template execution | `execution/file-generator.mjs` | reads template from manifest render config |
| snippet-template execution | `execution/spec-normalizer.mjs` `renderSnippet` | |
| file writer | `execution/file-writer.mjs` | |
| validate-file engine | `validation/validate-file.mjs` | |
| manifest types | `runtime/manifest-types.mjs` | new in Phase 1 |
| manifest loader | `runtime/manifest-loader.mjs` | new in Phase 1 |
| help builder | `runtime/help-builder.mjs` | manifest-only, no profile dep |
| command dispatcher | `runtime/command-dispatcher.mjs` | manifest-only, no profile dep |

---

## Obsolete surface (제거 — Phase 4)

| Module | Location | Reason |
|--------|----------|--------|
| profile loader | `profiles/profile-loader.mjs` | remote fetch + cache |
| profile registry | `profiles/profile-registry.mjs` | `readRemoteJsonResource`, `readRemoteTextResource` |
| profile cache | `profiles/profile-cache.mjs` | fs cache for remote profiles |
| config store | `profiles/config-store.mjs` | global mode config (~/.try-claude-dev-cli.json) |
| mode resolver | `profiles/mode-resolver.mjs` | reads global config to pick profile |
| version utils | `profiles/version-utils.mjs` | only needed for profile version parsing |
| help renderer (legacy) | `docs/help-renderer.mjs` | depends on activeProfile; replaced by `runtime/help-builder.mjs` |
| guide renderer | `docs/guide-renderer.mjs` | guide surface removed |
| profile validator | `validation/profile-validator.mjs` | used by generate path; can be inlined into manifest command config |
| batch executor | `execution/batch-executor.mjs` | batch surface removed (name reused for single command execute — keep logic, rename module) |
| command router (legacy) | `cli/command-router.mjs` | hardcodes KNOWN_ALIASES; replaced by manifest dispatcher |
| legacy run-cli core | `core/run-cli.mjs` | delegates to profile runtime; replaced by `runtime/command-dispatcher.mjs` |

---

## Separation boundary — core hot path

The following functions MUST NOT be called from the new runtime path:

- `loadActiveProfile` (profiles/profile-loader.mjs)
- `resolveActiveProfile` (profiles/mode-resolver.mjs)
- `readRemoteJsonResource` (profiles/profile-registry.mjs)
- `readRemoteTextResource` (profiles/profile-registry.mjs)
- `hydrateProfileSelection` (profiles/profile-registry.mjs)
- `writeProfileSelection` / `readGlobalConfig` (profiles/config-store.mjs)

The new path (`runtime/command-dispatcher.mjs`) satisfies this: it imports only
`cli/`, `execution/`, `shared/`, `validation/`, and `runtime/` modules.

---

## Host API contract (packages/dev-cli/src/run-cli.mjs)

```js
// (A) Legacy — alias string, delegates to profile runtime
runCli("frontend", { argv, cwd })
runCli({ alias: "frontend", argv, cwd })

// (B) New — manifest object, profile-free runtime
runCli({ manifest: { alias, id, commands, rules, helpSummary }, argv, cwd })
```

Wrapper packages (frontend, backend) migrate from (A) to (B) in Phase 2/3.
Signature (A) is removed in Phase 4.

---

## Validation checkpoint (Phase 1)

- [x] CliManifest type + assertManifest guard defined (`manifest-types.mjs`)
- [x] loadManifestDirect entry point defined (`manifest-loader.mjs`)
- [x] buildHelpPayload / buildSummaryHelp / buildDetailHelp — no profile dep (`help-builder.mjs`)
- [x] dispatchManifestCli — full manifest-only CLI path (`command-dispatcher.mjs`)
- [x] run-cli.mjs host API accepts manifest object (signature B)
- [x] profile runtime imports isolated to legacy path only
- [x] retained vs. obsolete surface documented in this file
