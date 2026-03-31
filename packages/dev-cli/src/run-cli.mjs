/**
 * run-cli.mjs — public host API for @seojaewan/dev-cli-core
 *
 * Two call signatures are supported:
 *
 * (A) Legacy alias string — delegates to the existing profile-based runtime.
 *     Still operational for the current test suite until Phase 4 cutover.
 *
 *       runCli("frontend", { argv, cwd })
 *       runCli({ alias: "frontend", argv, cwd })
 *
 * (B) Manifest object — new package-owned runtime path introduced in Phase 1.
 *     No profile loader, no remote fetch, no mode config.
 *
 *       runCli({ manifest: { alias: "frontend", id: "...", commands: { ... } }, argv, cwd })
 *
 * Host packages (frontend, backend) should migrate to signature (B) in Phase 2/3.
 * Signature (A) is removed in Phase 4.
 */

import { runCli as runCliLegacy } from "./core/run-cli.mjs";
import { dispatchManifestCli } from "./core/runtime/command-dispatcher.mjs";

/**
 * @param {string | Object} aliasOrOptions
 * @param {Object} [maybeOptions]
 * @returns {Promise<number>}
 */
export async function runCli(aliasOrOptions, maybeOptions = {}) {
  // Signature (B): manifest object path
  if (
    aliasOrOptions &&
    typeof aliasOrOptions === "object" &&
    !Array.isArray(aliasOrOptions) &&
    aliasOrOptions.manifest
  ) {
    const { manifest, ...rest } = aliasOrOptions;
    return dispatchManifestCli({ manifest, ...rest });
  }

  // Signature (A): legacy alias string path
  if (typeof aliasOrOptions === "string") {
    return runCliLegacy({
      alias: aliasOrOptions,
      ...maybeOptions
    });
  }

  // Signature (A) object form: { alias, argv, cwd, ... }
  return runCliLegacy(aliasOrOptions);
}
