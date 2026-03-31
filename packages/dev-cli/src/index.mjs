/**
 * @seojaewan/dev-cli-core public API
 *
 * Host packages (frontend, backend) import runCli from here and pass their
 * package-owned manifest.  No profile loader, no mode config, no remote fetch.
 */

export { dispatchManifestCli as runCli } from "./core/runtime/command-dispatcher.mjs";
