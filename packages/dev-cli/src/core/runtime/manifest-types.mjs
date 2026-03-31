/**
 * Package-owned command manifest types.
 *
 * A CliManifest is the single source of truth that a host package (frontend,
 * backend) injects into the core runtime.  The runtime never fetches remote
 * profiles or reads mode/cache config — it only executes what the manifest
 * describes.
 *
 * Shape reference (JSDoc, not enforced at runtime):
 *
 * @typedef {Object} ManifestCommand
 * @property {string}  description
 * @property {string}  [inputMode]        - "json" (default) | other
 * @property {Object}  [execution]        - { kind: "file" | "snippet" }
 * @property {Object}  [render]           - template / output config
 * @property {Object}  [namingPolicy]
 * @property {Object}  [generator]
 * @property {Object}  [contracts]        - help detail contracts
 * @property {Object}  [summary]          - help summary metadata
 *   @property {string[]} [summary.whenToUse]
 *   @property {Array}    [summary.relatedCommands]
 *   @property {string[]} [summary.flowRefs]
 *
 * @typedef {Object} ManifestFlow
 * @property {string}   title
 * @property {string}   [summary]
 * @property {Array<{command: string, purpose: string}>} steps
 *
 * @typedef {Object} ManifestHelpSummary
 * @property {string}  [summary]
 * @property {Object.<string, ManifestFlow>} [flows]
 *
 * @typedef {Object} CliManifest
 * @property {string}  alias       - e.g. "frontend", "backend"
 * @property {Object.<string, ManifestCommand>} commands
 * @property {Object}  [rules]
 * @property {ManifestHelpSummary} [helpSummary]
 */

/**
 * Assert that a value looks like a valid CliManifest at runtime.
 * Throws INVALID_MANIFEST if the shape is wrong.
 *
 * @param {unknown} manifest
 * @returns {CliManifest}
 */
export function assertManifest(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    const error = new Error("manifest must be a plain object");
    error.code = "INVALID_MANIFEST";
    throw error;
  }

  if (typeof manifest.alias !== "string" || manifest.alias.trim() === "") {
    const error = new Error("manifest.alias must be a non-empty string");
    error.code = "INVALID_MANIFEST";
    error.details = { field: "alias" };
    throw error;
  }

  if (!manifest.commands || typeof manifest.commands !== "object" || Array.isArray(manifest.commands)) {
    const error = new Error("manifest.commands must be a plain object");
    error.code = "INVALID_MANIFEST";
    error.details = { field: "commands" };
    throw error;
  }

  return manifest;
}
