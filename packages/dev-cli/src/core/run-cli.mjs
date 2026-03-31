import { parseArgv } from "./cli/arg-parser.mjs";
import { executeSpecCommand } from "./execution/batch-executor.mjs";
import { routeCommand } from "./cli/command-router.mjs";
import { writeProfileSelection } from "./profiles/config-store.mjs";
import { errorToPayload } from "./cli/error-formatter.mjs";
import { writeGeneratedFiles } from "./execution/file-writer.mjs";
import { createHelpPayload } from "./docs/help-renderer.mjs";
import { resolveActiveProfile } from "./profiles/mode-resolver.mjs";
import { formatOutput } from "./cli/output.mjs";
import { findProjectRoot } from "./shared/path-utils.mjs";
import { loadActiveProfile } from "./profiles/profile-loader.mjs";
import { hydrateProfileSelection } from "./profiles/profile-registry.mjs";
import { validateRequest } from "./validation/profile-validator.mjs";
import { validateFiles } from "./validation/validate-file.mjs";
import { createCliError } from "./shared/recipe-utils.mjs";
import { parseCommandSpec, parseValidateFileSpec } from "./execution/spec-parser.mjs";

function createSuccessPayload(payload) {
  return {
    ok: true,
    ...payload
  };
}

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

function assertCommandExists(profile, commandName) {
  if (!commandName) {
    return;
  }

  if (!profile.commands?.[commandName]) {
    throw createCliError(
      "UNKNOWN_COMMAND",
      `Unknown command: ${commandName}`,
      {
        command: commandName,
        profileId: profile.id
      }
    );
  }
}

function createSuggestedModeCommand(alias) {
  return `${alias} mode set --mode personal --version v1`;
}

function getProfileOverrideOption(options = {}) {
  for (const option of ["profile", "mode", "version"]) {
    if (option in options) {
      return option;
    }
  }

  return null;
}

function assertNoProfileOverrideOptions({ alias, options }) {
  const overrideOption = getProfileOverrideOption(options);

  if (!overrideOption) {
    return;
  }

  const suggestedCommand = createSuggestedModeCommand(alias);
  throw createCliError(
    "PROFILE_OVERRIDE_UNSUPPORTED",
    `This command does not accept --${toOptionFlag(overrideOption)}. Run \`${suggestedCommand}\` to change the active profile before retrying.`,
    {
      alias,
      option: overrideOption,
      suggestedCommand
    }
  );
}

function createUnsetActiveProfileError(alias) {
  const suggestedCommand = createSuggestedModeCommand(alias);
  return createCliError(
    "ACTIVE_PROFILE_NOT_SET",
    `No active profile is configured for ${alias}. Run \`${suggestedCommand}\` first, then retry the command.`,
    {
      alias,
      suggestedCommand
    }
  );
}

function mapModeSetError(error, { alias, mode, version }) {
  const rootProfilePath = `profiles/${alias}/${mode}/${version}/profile.json`;
  const cause = error?.details?.cause ?? "";

  if (
    error?.code === "PROFILE_FETCH_FAILED" &&
    error?.details?.relativePath === rootProfilePath &&
    /^HTTP 404\b/.test(cause)
  ) {
    return createCliError(
      "PROFILE_NOT_FOUND",
      `Profile ${alias}/${mode}/${version} could not be found on the remote source.`,
      {
        alias,
        mode,
        version,
        relativePath: rootProfilePath
      }
    );
  }

  return error;
}

async function handleModeCommand({ alias, route }) {
  if (route.modeAction === "show") {
    assertAllowedOptions(
      route.options,
      new Set([
        "fields"
      ]),
      "mode show"
    );
    const activeProfile = await resolveActiveProfile({
      alias
    });

    if (!activeProfile) {
      return createSuccessPayload({
        alias,
        action: "mode",
        configured: false,
        activeProfile: null,
        suggestedCommand: createSuggestedModeCommand(alias)
      });
    }

    return createSuccessPayload({
      alias,
      action: "mode",
      configured: true,
      activeProfile
    });
  }

  if (route.modeAction !== "set") {
    const error = new Error(`Unsupported mode action: ${route.modeAction}`);
    error.code = "UNSUPPORTED_MODE_ACTION";
    throw error;
  }

  assertAllowedOptions(
    route.options,
    new Set([
      "fields",
      "mode",
      "version"
    ]),
    "mode set"
  );

  if (!route.options.mode) {
    const error = new Error("Missing required option: --mode");
    error.code = "MISSING_ARGUMENT";
    error.details = {
      argument: "mode"
    };
    throw error;
  }

  if (/[\/@]/.test(String(route.options.mode))) {
    await hydrateProfileSelection({
      selection: {
        source: "explicit",
        mode: String(route.options.mode),
        version: route.options.version ?? "v1"
      }
    });
  }

  if (!route.options.version) {
    const error = new Error("Missing required option: --version");
    error.code = "MISSING_ARGUMENT";
    error.details = {
      argument: "version"
    };
    throw error;
  }

  const activeProfile = await hydrateProfileSelection({
    selection: {
      source: "explicit",
      mode: String(route.options.mode),
      version: route.options.version
    }
  });

  try {
    await loadActiveProfile({
      alias,
      mode: activeProfile.mode,
      version: activeProfile.version,
      remoteOnly: true
    });
  } catch (error) {
    throw mapModeSetError(error, {
      alias,
      mode: activeProfile.mode,
      version: activeProfile.version
    });
  }

  const saved = await writeProfileSelection({
    alias,
    mode: activeProfile.mode,
    version: activeProfile.version
  });

  return createSuccessPayload({
    alias,
    action: "mode",
    activeProfile,
    saved
  });
}

async function resolveProfileContext({ alias }) {
  const activeProfile = await resolveActiveProfile({
    alias
  });

  if (!activeProfile) {
    throw createUnsetActiveProfileError(alias);
  }

  const { profile } = await loadActiveProfile({
    alias,
    mode: activeProfile.mode,
    version: activeProfile.version
  });

  return {
    activeProfile,
    profile
  };
}

async function handleHelpCommand({ alias, route }) {
  assertNoProfileOverrideOptions({
    alias,
    options: route.options
  });
  assertAllowedOptions(
    route.options,
    new Set([
      "help",
      "command",
      "fields"
    ]),
    "help"
  );
  const activeProfile = await resolveActiveProfile({
    alias
  });

  if (!activeProfile && route.commandName) {
    throw createUnsetActiveProfileError(alias);
  }

  let profile = null;

  if (activeProfile) {
    ({ profile } = await loadActiveProfile({
      alias,
      mode: activeProfile.mode,
      version: activeProfile.version
    }));
    assertCommandExists(profile, route.commandName);
  }

  return createHelpPayload({
    alias,
    activeProfile,
    profile,
    commandName: route.commandName
  });
}

async function handleGenerateCommand({ alias, route, projectRoot }) {
  assertNoProfileOverrideOptions({
    alias,
    options: route.options
  });
  const { activeProfile, profile } = await resolveProfileContext({
    alias
  });
  const spec = parseCommandSpec(route);
  const result = await executeSpecCommand({
    profile,
    profileId: profile.id,
    commandName: route.commandName,
    spec,
    projectRoot
  });

  if (!result.files?.length) {
    return createSuccessPayload({
      alias,
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
    alias,
    apply: Boolean(route.options.apply),
    ...result,
    files: writtenFiles
  });
}

async function handleValidateCommand({ alias, route, projectRoot }) {
  assertNoProfileOverrideOptions({
    alias,
    options: route.options
  });
  assertAllowedOptions(
    route.options,
    new Set([
      "fields",
      "command",
      "name",
      "path",
      "kind",
      "method",
      "content",
      "file"
    ]),
    "validate"
  );
  const { activeProfile, profile } = await resolveProfileContext({
    alias
  });
  const checks = await validateRequest({
    profile,
    commandName: route.target ?? route.options.command ?? "validate",
    args: {
      name: route.options.name,
      path: route.options.path,
      kind: route.options.kind,
      method: route.options.method,
      content: route.options.content
    },
    files: route.options.content
      ? [
          {
            path: route.options.file ?? "<inline>",
            content: route.options.content
          }
        ]
      : [],
    projectRoot
  });

  return createSuccessPayload({
    alias,
    action: "validate",
    activeProfile,
    ...checks
  });
}

async function handleValidateFileCommand({ alias, route, projectRoot }) {
  assertNoProfileOverrideOptions({
    alias,
    options: route.options
  });
  assertAllowedOptions(
    route.options,
    new Set([
      "fields"
    ]),
    "validate-file"
  );
  const { activeProfile, profile } = await resolveProfileContext({
    alias
  });
  assertCommandExists(profile, "validateFile");
  const spec = parseValidateFileSpec(route);
  const validation = await validateFiles({
    profile,
    directoryPath: spec.directory,
    projectRoot
  });

  return {
    alias,
    action: "validate-file",
    activeProfile,
    exitCode: validation.ok ? 0 : 1,
    ...validation
  };
}

export async function runCli({
  alias,
  argv = process.argv.slice(2),
  cwd = process.cwd(),
  stdout = process.stdout,
  stderr = process.stderr
}) {
  const projectRoot = findProjectRoot(cwd);

  try {
    const parsed = parseArgv(argv);
    const route = routeCommand(alias, parsed);

    let payload;
    if (route.action === "help") {
      payload = await handleHelpCommand({
        alias,
        route
      });
    } else if (route.action === "mode") {
      payload = await handleModeCommand({
        alias,
        route
      });
    } else if (route.action === "validate") {
      payload = await handleValidateCommand({
        alias,
        route,
        projectRoot
      });
    } else if (route.action === "validateFile") {
      payload = await handleValidateFileCommand({
        alias,
        route,
        projectRoot
      });
    } else {
      payload = await handleGenerateCommand({
        alias,
        route,
        projectRoot
      });
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
