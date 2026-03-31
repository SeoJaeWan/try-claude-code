/**
 * run-cli.mjs — public host API for @seojaewan/dev-cli-core
 *
 * Accepts only the manifest-owned call signature:
 *
 *   runCli({ manifest: { alias: "frontend", id: "...", commands: { ... } }, argv, cwd })
 *
 * Host packages (frontend, backend) pass their package-owned manifest directly.
 * No profile loader, no alias string routing, no mode config.
 */

import { dispatchManifestCli } from "./core/runtime/command-dispatcher.mjs";

/**
 * @param {Object} options
 * @param {import("./core/runtime/manifest-types.mjs").CliManifest} options.manifest
 * @param {string[]} [options.argv]
 * @param {string}  [options.cwd]
 * @returns {Promise<number>}
 */
export async function runCli({ manifest, ...rest }) {
  return dispatchManifestCli({ manifest, ...rest });
}
