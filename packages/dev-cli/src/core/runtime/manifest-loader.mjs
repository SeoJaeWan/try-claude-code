/**
 * manifest-loader.mjs
 *
 * Loading path for package-owned manifests.
 *
 * Phase 1 establishes the contract: host packages pass a CliManifest object
 * directly into the runtime.  No remote fetch, no profile cache, no mode
 * config is involved.
 *
 * Future phases (2, 3) will add:
 *   - resolveManifestFromPackage(packageRoot)  — reads src/manifest.mjs from a
 *     package directory for use by wrapper binaries
 *
 * The profile-based loader (core/profiles/profile-loader.mjs) remains in
 * place for the existing legacy path and is removed in Phase 4.
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
