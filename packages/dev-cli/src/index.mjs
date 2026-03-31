/**
 * @seojaewan/dev-cli-core public API
 *
 * Host packages (frontend, backend) import runCli from here and pass their
 * package-owned manifest.  All profile/mode/remote-fetch machinery has been
 * removed in Phase 4.
 */

export { dispatchManifestCli as runCli } from "./core/runtime/command-dispatcher.mjs";
