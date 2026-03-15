import { runCli as runCliCore } from "./core/run-cli.mjs";

export async function runCli(aliasOrOptions, maybeOptions = {}) {
  if (typeof aliasOrOptions === "string") {
    return runCliCore({
      alias: aliasOrOptions,
      ...maybeOptions
    });
  }

  return runCliCore(aliasOrOptions);
}
