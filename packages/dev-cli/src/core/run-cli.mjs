import { parseArgv } from "./arg-parser.mjs";
import { executeBatch, executeSpecCommand } from "./batch-executor.mjs";
import { routeCommand } from "./command-router.mjs";
import { writeProfileSelection } from "./config-store.mjs";
import { errorToPayload } from "./error-formatter.mjs";
import { writeGeneratedFiles } from "./file-writer.mjs";
import { createGuidePayload, renderGuideText } from "./guide-renderer.mjs";
import { createHelpPayload, renderHelpText } from "./help-renderer.mjs";
import { resolveActiveProfile } from "./mode-resolver.mjs";
import { formatOutput } from "./output.mjs";
import { findProjectRoot } from "./path-utils.mjs";
import { loadActiveProfile } from "./profile-loader.mjs";
import { hydrateProfileSelection } from "./profile-registry.mjs";
import { validateRequest } from "./profile-validator.mjs";
import { validateFiles } from "./validate-file.mjs";
import { createCliError } from "./recipe-utils.mjs";
import { parseBatchSpec, parseCommandSpec, parseValidateFileSpec } from "./spec-parser.mjs";

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

function assertNoProfileOverrideOptions({ alias, role, options }) {
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
      role,
      option: overrideOption,
      suggestedCommand
    }
  );
}

function createUnsetActiveProfileError(alias, role) {
  const suggestedCommand = createSuggestedModeCommand(alias);
  return createCliError(
    "ACTIVE_PROFILE_NOT_SET",
    `No active profile is configured for ${alias}. Run \`${suggestedCommand}\` first, then retry the command.`,
    {
      alias,
      role,
      suggestedCommand
    }
  );
}

function mapModeSetError(error, { role, mode, version }) {
  const rootProfilePath = `profiles/${role}/${mode}/${version}/profile.json`;
  const cause = error?.details?.cause ?? "";

  if (
    error?.code === "PROFILE_FETCH_FAILED" &&
    error?.details?.relativePath === rootProfilePath &&
    /^HTTP 404\b/.test(cause)
  ) {
    return createCliError(
      "PROFILE_NOT_FOUND",
      `Profile ${role}/${mode}/${version} could not be found on the remote source.`,
      {
        role,
        mode,
        version,
        relativePath: rootProfilePath
      }
    );
  }

  return error;
}

async function handleModeCommand({ alias, role, route }) {
  if (route.modeAction === "show") {
    assertAllowedOptions(
      route.options,
      new Set([
        "text",
        "fields"
      ]),
      "mode show"
    );
    const activeProfile = await resolveActiveProfile({
      role
    });

    if (!activeProfile) {
      return createSuccessPayload({
        alias,
        role,
        action: "mode",
        configured: false,
        activeProfile: null,
        suggestedCommand: createSuggestedModeCommand(alias)
      });
    }

    return createSuccessPayload({
      alias,
      role,
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
      "text",
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
      role,
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
    role,
    selection: {
      source: "explicit",
      mode: String(route.options.mode),
      version: route.options.version
    }
  });

  try {
    await loadActiveProfile({
      role,
      mode: activeProfile.mode,
      version: activeProfile.version
    });
  } catch (error) {
    throw mapModeSetError(error, {
      role,
      mode: activeProfile.mode,
      version: activeProfile.version
    });
  }

  const saved = await writeProfileSelection({
    role,
    mode: activeProfile.mode,
    version: activeProfile.version
  });

  return createSuccessPayload({
    role,
    action: "mode",
    activeProfile,
    saved
  });
}

async function resolveProfileContext({ alias, role }) {
  const activeProfile = await resolveActiveProfile({
    role
  });

  if (!activeProfile) {
    throw createUnsetActiveProfileError(alias, role);
  }

  const { profile } = await loadActiveProfile({
    role,
    mode: activeProfile.mode,
    version: activeProfile.version
  });

  return {
    activeProfile,
    profile
  };
}

async function handleHelpCommand({ alias, role, route }) {
  assertNoProfileOverrideOptions({
    alias,
    role,
    options: route.options
  });
  const activeProfile = await resolveActiveProfile({
    role
  });
  let profile = null;

  if (activeProfile) {
    ({ profile } = await loadActiveProfile({
      role,
      mode: activeProfile.mode,
      version: activeProfile.version
    }));
    assertCommandExists(profile, route.commandName);
  }

  const payload = createHelpPayload({
    alias,
    role,
    activeProfile,
    profile,
    commandName: route.commandName,
    full: Boolean(route.options.full)
  });

  if (route.format === "text") {
    return {
      ok: true,
      format: "text",
      payload: renderHelpText(payload)
    };
  }

  return payload;
}

async function handleGuideCommand({ alias, role, route }) {
  assertNoProfileOverrideOptions({
    alias,
    role,
    options: route.options
  });
  assertAllowedOptions(
    route.options,
    new Set([
      "text",
      "json",
      "fields"
    ]),
    "guide"
  );
  const { activeProfile, profile } = await resolveProfileContext({
    alias,
    role
  });
  assertCommandExists(profile, route.commandName);
  const payload = createGuidePayload({
    alias,
    role,
    activeProfile,
    profile,
    commandName: route.commandName
  });

  if (route.format === "text") {
    return {
      ok: true,
      format: "text",
      payload: renderGuideText(payload)
    };
  }

  return payload;
}

async function handleGenerateCommand({ alias, role, route, projectRoot }) {
  assertNoProfileOverrideOptions({
    alias,
    role,
    options: route.options
  });
  const { activeProfile, profile } = await resolveProfileContext({
    alias,
    role
  });
  const spec = parseCommandSpec(route);
  const result = await executeSpecCommand({
    role,
    profile,
    profileId: profile.id,
    commandName: route.commandName,
    spec,
    projectRoot
  });

  if (!result.files?.length) {
    return createSuccessPayload({
      alias,
      role,
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
    role,
    apply: Boolean(route.options.apply),
    ...result,
    files: writtenFiles
  });
}

async function handleBatchCommand({ alias, role, route, projectRoot }) {
  assertNoProfileOverrideOptions({
    alias,
    role,
    options: route.options
  });
  const { activeProfile, profile } = await resolveProfileContext({
    alias,
    role
  });
  const batchSpec = parseBatchSpec(route);
  const result = await executeBatch({
    profile,
    profileId: profile.id,
    role,
    batchSpec,
    projectRoot,
    apply: Boolean(route.options.apply),
    force: Boolean(route.options.force)
  });

  return createSuccessPayload({
    alias,
    role,
    activeProfile,
    ...result
  });
}

async function handleValidateCommand({ alias, role, route, projectRoot }) {
  assertNoProfileOverrideOptions({
    alias,
    role,
    options: route.options
  });
  assertAllowedOptions(
    route.options,
    new Set([
      "text",
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
    alias,
    role
  });
  const checks = await validateRequest({
    role,
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
    role,
    action: "validate",
    activeProfile,
    ...checks
  });
}

async function handleValidateFileCommand({ alias, role, route, projectRoot }) {
  assertNoProfileOverrideOptions({
    alias,
    role,
    options: route.options
  });
  assertAllowedOptions(
    route.options,
    new Set([
      "text",
      "fields"
    ]),
    "validate-file"
  );
  const { activeProfile, profile } = await resolveProfileContext({
    alias,
    role
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
    role,
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
        role: route.role,
        route
      });
    } else if (route.action === "guide") {
      payload = await handleGuideCommand({
        alias,
        role: route.role,
        route
      });
    } else if (route.action === "mode") {
      payload = await handleModeCommand({
        alias,
        role: route.role,
        route
      });
    } else if (route.action === "validate") {
      payload = await handleValidateCommand({
        alias,
        role: route.role,
        route,
        projectRoot
      });
    } else if (route.action === "validateFile") {
      payload = await handleValidateFileCommand({
        alias,
        role: route.role,
        route,
        projectRoot
      });
    } else if (route.action === "batch") {
      payload = await handleBatchCommand({
        alias,
        role: route.role,
        route,
        projectRoot
      });
    } else {
      payload = await handleGenerateCommand({
        alias,
        role: route.role,
        route,
        projectRoot
      });
    }

    const output = formatOutput(payload, route.format, route.options.fields);
    stdout.write(output.text);
    process.exitCode = output.exitCode;
    return output.exitCode;
  } catch (error) {
    const parsed = parseArgv(argv);
    const format = parsed.options.text ? "text" : "json";
    const payload = errorToPayload(error);
    const output = formatOutput(payload, format, parsed.options.fields);
    stderr.write(output.text);
    process.exitCode = output.exitCode;
    return output.exitCode;
  }
}
