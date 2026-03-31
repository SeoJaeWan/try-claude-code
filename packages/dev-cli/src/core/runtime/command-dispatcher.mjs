/**
 * command-dispatcher.mjs
 *
 * Routes a parsed CLI invocation to the appropriate executor using only a
 * CliManifest.  No profile loader, no mode resolver, no remote fetch.
 *
 * Supported surface:
 *   - help (summary and detail)
 *   - execute  (file-template and snippet-template)
 *   - validate-file
 */

import { createCliError } from "../shared/recipe-utils.mjs";
import { findProjectRoot } from "../shared/path-utils.mjs";
import { parseArgv } from "../cli/arg-parser.mjs";
import { formatOutput } from "../cli/output.mjs";
import { errorToPayload } from "../cli/error-formatter.mjs";
import { writeGeneratedFiles } from "../execution/file-writer.mjs";
import { executeSpecCommand } from "../execution/spec-executor.mjs";
import { parseCommandSpec, parseValidateFileSpec } from "../execution/spec-parser.mjs";
import { validateFiles } from "../validation/validate-file.mjs";
import { buildHelpPayload } from "./help-builder.mjs";
import { loadManifestDirect } from "./manifest-loader.mjs";

function toOptionFlag(optionName) {
  return optionName.replace(/[A-Z]/g, (value) => `-${value.toLowerCase()}`);
}

function assertAllowedOptions(options, allowedKeys, commandName) {
  const unknownOptions = Object.keys(options ?? {}).filter((key) => !allowedKeys.has(key));

  if (unknownOptions.length > 0) {
    throw createCliError(
      "UNKNOWN_OPTION",
      `Unknown option for ${commandName}: --${toOptionFlag(unknownOptions[0])}`,
      {
        command: commandName,
        option: unknownOptions[0]
      }
    );
  }
}

function assertCommandExists(manifest, commandName) {
  if (!commandName) {
    return;
  }

  if (!manifest.commands?.[commandName]) {
    throw createCliError(
      "UNKNOWN_COMMAND",
      `Unknown command: ${commandName}`,
      {
        command: commandName,
        alias: manifest.alias
      }
    );
  }
}

// inline helper to avoid circular import with arg-parser
function normalizeCommandNameInline(name) {
  const normalized = name ?? "";
  return normalized.replace(/-([a-z])/g, (_, v) => v.toUpperCase());
}

function routeManifestCommandSync(parsed) {
  const rawFirst = parsed.positionals[0] ?? "";
  const first = normalizeCommandNameInline(rawFirst);

  if (first === "help" || first === "describe") {
    throw createCliError("UNKNOWN_COMMAND", `Unknown command: ${rawFirst}`, {
      command: rawFirst
    });
  }

  if (first === "mode") {
    throw createCliError("UNKNOWN_COMMAND", `Unknown command: mode`, {
      command: "mode"
    });
  }

  if (parsed.options.help || first === "") {
    return {
      action: "help",
      commandName: first || normalizeCommandNameInline(parsed.options.command ?? "") || null,
      options: parsed.options
    };
  }

  if (first === "validateFile") {
    return {
      action: "validateFile",
      commandName: "validateFile",
      extraPositionals: parsed.positionals.slice(1),
      options: parsed.options
    };
  }

  return {
    action: "execute",
    commandName: first,
    extraPositionals: parsed.positionals.slice(1),
    options: parsed.options
  };
}

function createSuccessPayload(payload) {
  return { ok: true, ...payload };
}

async function handleHelp({ manifest, route }) {
  assertAllowedOptions(
    route.options,
    new Set(["help", "command", "fields"]),
    "help"
  );

  if (route.commandName) {
    assertCommandExists(manifest, route.commandName);
  }

  const payload = buildHelpPayload(manifest, route.commandName);
  return createSuccessPayload(payload);
}

async function handleExecute({ manifest, route, projectRoot }) {
  assertCommandExists(manifest, route.commandName);
  const spec = parseCommandSpec(route);
  const result = await executeSpecCommand({
    profile: manifest,
    profileId: manifest.id ?? manifest.alias,
    commandName: route.commandName,
    spec,
    projectRoot
  });

  if (!result.files?.length) {
    return createSuccessPayload({
      alias: manifest.alias,
      apply: Boolean(route.options.apply),
      ...result
    });
  }

  const writtenFiles = await writeGeneratedFiles({
    projectRoot,
    files: result.files,
    dryRun: !Boolean(route.options.apply),
    force: Boolean(route.options.force)
  });

  return createSuccessPayload({
    alias: manifest.alias,
    apply: Boolean(route.options.apply),
    ...result,
    files: writtenFiles
  });
}

async function handleValidateFile({ manifest, route, projectRoot }) {
  assertAllowedOptions(route.options, new Set(["fields"]), "validate-file");
  assertCommandExists(manifest, "validateFile");
  const spec = parseValidateFileSpec(route);
  const validation = await validateFiles({
    profile: manifest,
    directoryPath: spec.directory,
    projectRoot
  });

  return {
    alias: manifest.alias,
    action: "validate-file",
    exitCode: validation.ok ? 0 : 1,
    ...validation
  };
}

/**
 * Run a manifest-owned CLI invocation end-to-end.
 *
 * @param {Object} params
 * @param {import("./manifest-types.mjs").CliManifest} params.manifest
 * @param {string[]} [params.argv]
 * @param {string}  [params.cwd]
 * @param {NodeJS.WritableStream} [params.stdout]
 * @param {NodeJS.WritableStream} [params.stderr]
 * @returns {Promise<number>}  exit code
 */
export async function dispatchManifestCli({
  manifest: rawManifest,
  argv = process.argv.slice(2),
  cwd = process.cwd(),
  stdout = process.stdout,
  stderr = process.stderr
}) {
  const projectRoot = findProjectRoot(cwd);

  try {
    const manifest = loadManifestDirect(rawManifest);
    const parsed = parseArgv(argv);
    const route = routeManifestCommandSync(parsed);

    let payload;
    if (route.action === "help") {
      payload = await handleHelp({ manifest, route });
    } else if (route.action === "validateFile") {
      payload = await handleValidateFile({ manifest, route, projectRoot });
    } else {
      payload = await handleExecute({ manifest, route, projectRoot });
    }

    const output = formatOutput(payload, route.options.fields);
    stdout.write(output.text);
    process.exitCode = output.exitCode;
    return output.exitCode;
  } catch (error) {
    const parsed = parseArgv(argv);
    const payload = errorToPayload(error);
    const output = formatOutput(payload, parsed.options.fields);
    stderr.write(output.text);
    process.exitCode = output.exitCode;
    return output.exitCode;
  }
}
