# core/runtime — Package-Owned Contract Boundaries

현재 구조 기준 경계 문서. 모든 표는 지금 실제 상태를 설명한다.

---

## Current directory layout

```
src/core/
  cli/           parse, route, output, error  (profile-free)
  runtime/       manifest types, loader, dispatcher, help-builder
  execution/     spec-executor, spec-normalizer, file-generator, file-writer, template-engine, render-context, command-args-resolver, spec-parser, ref-resolver
  shared/        path-utils, recipe-utils, naming, path-patterns
  validation/    validate-file, command-validator
  profiles/      [OBSOLETE — remote fetch/cache/config modules, not on hot path]
  docs/          [OBSOLETE — legacy help-renderer, guide-renderer]
```

---

## Retained capabilities (유지)

| Module | Location | Notes |
|--------|----------|-------|
| argv parser | `cli/arg-parser.mjs` | profile-free |
| output formatter | `cli/output.mjs` | JSON-only |
| error formatter | `cli/error-formatter.mjs` | JSON-only |
| spec executor | `execution/spec-executor.mjs` | single command execute; `executeSpecCommand` entry |
| file-template execution | `execution/file-generator.mjs` | reads template from manifest render config |
| snippet-template execution | `execution/spec-normalizer.mjs` `renderSnippet` | |
| file writer | `execution/file-writer.mjs` | |
| validate-file engine | `validation/validate-file.mjs` | |
| manifest types | `runtime/manifest-types.mjs` | |
| manifest loader | `runtime/manifest-loader.mjs` | |
| help builder | `runtime/help-builder.mjs` | manifest-only, no profile dep |
| command dispatcher | `runtime/command-dispatcher.mjs` | manifest-only, no profile dep |

---

## Obsolete surface (미사용 — profiles/, docs/ 잔존 파일)

| Module | Location | Reason |
|--------|----------|--------|
| profile loader | `profiles/profile-loader.mjs` | remote fetch + cache; not on hot path |
| profile registry | `profiles/profile-registry.mjs` | `readRemoteJsonResource`, `readRemoteTextResource` |
| profile cache | `profiles/profile-cache.mjs` | fs cache for remote profiles |
| config store | `profiles/config-store.mjs` | global mode config (~/.try-claude-dev-cli.json) |
| mode resolver | `profiles/mode-resolver.mjs` | reads global config to pick profile |
| version utils | `profiles/version-utils.mjs` | only needed for profile version parsing |
| help renderer (legacy) | `docs/help-renderer.mjs` | depends on activeProfile; replaced by `runtime/help-builder.mjs` |
| guide renderer | `docs/guide-renderer.mjs` | guide surface removed |
| profile validator | `validation/profile-validator.mjs` | can be inlined into manifest command config |
| command router (legacy) | `cli/command-router.mjs` | hardcoded KNOWN_ALIASES; replaced by manifest dispatcher (already deleted) |

---

## Separation boundary — core hot path

The following functions MUST NOT be called from the runtime path:

- `loadActiveProfile` (profiles/profile-loader.mjs)
- `resolveActiveProfile` (profiles/mode-resolver.mjs)
- `readRemoteJsonResource` (profiles/profile-registry.mjs)
- `readRemoteTextResource` (profiles/profile-registry.mjs)
- `hydrateProfileSelection` (profiles/profile-registry.mjs)
- `writeProfileSelection` / `readGlobalConfig` (profiles/config-store.mjs)

The current path (`runtime/command-dispatcher.mjs`) satisfies this: it imports only
`cli/`, `execution/`, `shared/`, `validation/`, and `runtime/` modules.

---

## Host API contract (packages/dev-cli/src/run-cli.mjs)

```js
// Current — manifest object, profile-free runtime
runCli({ manifest: { alias, id, commands, rules, helpSummary }, argv, cwd })
```

Wrapper packages (`packages/frontend`, `packages/backend`) own their `manifest.mjs` and pass it directly to `runCli`.

---

## Validation checkpoint

- [x] CliManifest type + assertManifest guard defined (`manifest-types.mjs`)
- [x] loadManifestDirect entry point defined (`manifest-loader.mjs`)
- [x] buildHelpPayload / buildSummaryHelp / buildDetailHelp — no profile dep (`help-builder.mjs`)
- [x] dispatchManifestCli — full manifest-only CLI path (`command-dispatcher.mjs`)
- [x] run-cli.mjs is manifest-only (no legacy alias string path)
- [x] command-router.mjs deleted
- [x] batch-executor.mjs renamed to spec-executor.mjs
- [x] profile runtime imports isolated to obsolete profiles/ only
- [x] retained vs. obsolete surface documented in this file
