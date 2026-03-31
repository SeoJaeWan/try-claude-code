/**
 * manifest-loader.mjs
 *
 * Loading path for package-owned manifests.
 *
 * Host packages pass a CliManifest object directly into the runtime via
 * runCli({ manifest }).  No remote fetch, no profile cache, no mode config.
 */

import { assertManifest } from "./manifest-types.mjs";

/**
 * Accept a manifest object provided directly by the host (wrapper binary).
 * Validates shape and returns it unchanged.
 *
 * This is the canonical entry point for the new runtime path.
 *
 * @param {unknown} manifest
 * @returns {import("./manifest-types.mjs").CliManifest}
 */
export function loadManifestDirect(manifest) {
  return assertManifest(manifest);
}
