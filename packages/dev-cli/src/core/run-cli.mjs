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
import { createPublisherGuideModel } from "./publisher-guide-model.mjs";
import { renderPublisherGuideHtml } from "./publisher-guide-html-renderer.mjs";
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

async function handleModeCommand({ role, route, repoRoot }) {
  if (route.modeAction === "show") {
    const selection = await resolveActiveProfile({
      role,
      repoRoot,
      options: route.options
    });
    const activeProfile = await hydrateProfileSelection({
      role,
      selection
    });

    return createSuccessPayload({
      role,
      action: "mode",
      activeProfile
    });
  }

  if (route.modeAction !== "set") {
    const error = new Error(`Unsupported mode action: ${route.modeAction}`);
    error.code = "UNSUPPORTED_MODE_ACTION";
    throw error;
  }

  if (!route.options.mode) {
    const error = new Error("Missing required option: --mode");
    error.code = "MISSING_ARGUMENT";
    error.details = {
      argument: "mode"
    };
    throw error;
  }

  if (
    !route.options.version &&
    !/[@/]/.test(String(route.options.mode))
  ) {
    const error = new Error("Missing required option: --version");
    error.code = "MISSING_ARGUMENT";
    error.details = {
      argument: "version"
    };
    throw error;
  }

  const [mode, inlineVersion] = /@/.test(String(route.options.mode))
    ? String(route.options.mode).split("@")
    : String(route.options.mode).split("/");
  const requestedVersion = inlineVersion ?? route.options.version;
  const scope = route.options.repo ? "repo" : "global";
  const activeProfile = await hydrateProfileSelection({
    role,
    selection: {
      source: "explicit",
      mode,
      version: requestedVersion
    }
  });

  const saved = await writeProfileSelection({
    scope,
    repoRoot,
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

async function resolveProfileContext({ role, repoRoot, options }) {
  const selection = await resolveActiveProfile({
    role,
    repoRoot,
    options
  });
  const activeProfile = await hydrateProfileSelection({
    role,
    selection
  });
  const { profile } = await loadActiveProfile({
    repoRoot,
    role,
    mode: activeProfile.mode,
    version: activeProfile.version
  });

  return {
    activeProfile,
    profile
  };
}

async function handleHelpCommand({ alias, role, route, repoRoot }) {
  const { activeProfile, profile } = await resolveProfileContext({
    role,
    repoRoot,
    options: route.options
  });
  assertCommandExists(profile, route.commandName);
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

async function handleGuideCommand({ alias, role, route, repoRoot }) {
  const { activeProfile, profile } = await resolveProfileContext({
    role,
    repoRoot,
    options: route.options
  });
  assertCommandExists(profile, route.commandName);
  const payload = createGuidePayload({
    alias,
    role,
    activeProfile,
    profile,
    commandName: route.commandName
  });

  if (route.format === "html") {
    if (role !== "publisher") {
      throw createCliError(
        "HTML_GUIDE_UNSUPPORTED",
        "--html guide is only supported for tcp",
        {
          alias,
          role
        }
      );
    }

    const model = createPublisherGuideModel({
      alias,
      role,
      activeProfile,
      profile
    });

    return {
      ok: true,
      format: "html",
      payload: renderPublisherGuideHtml(model, {
        activeCommandId: route.commandName
      })
    };
  }

  if (route.format === "text") {
    return {
      ok: true,
      format: "text",
      payload: renderGuideText(payload)
    };
  }

  return payload;
}

async function handleGenerateCommand({ alias, role, route, repoRoot }) {
  const { activeProfile, profile } = await resolveProfileContext({
    role,
    repoRoot,
    options: route.options
  });
  const spec = parseCommandSpec(route);
  const result = await executeSpecCommand({
    role,
    profile,
    profileId: profile.id,
    commandName: route.commandName,
    spec,
    repoRoot
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
    repoRoot,
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

async function handleBatchCommand({ alias, role, route, repoRoot }) {
  const { activeProfile, profile } = await resolveProfileContext({
    role,
    repoRoot,
    options: route.options
  });
  const batchSpec = parseBatchSpec(route);
  const result = await executeBatch({
    profile,
    profileId: profile.id,
    role,
    batchSpec,
    repoRoot,
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

async function handleValidateCommand({ alias, role, route, repoRoot }) {
  assertAllowedOptions(
    route.options,
    new Set([
      "text",
      "fields",
      "profile",
      "mode",
      "version",
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
    role,
    repoRoot,
    options: route.options
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
    repoRoot
  });

  return createSuccessPayload({
    alias,
    role,
    action: "validate",
    activeProfile,
    ...checks
  });
}

async function handleValidateFileCommand({ alias, role, route, repoRoot }) {
  assertAllowedOptions(
    route.options,
    new Set([
      "text",
      "fields",
      "profile",
      "mode",
      "version"
    ]),
    "validate-file"
  );
  const { activeProfile, profile } = await resolveProfileContext({
    role,
    repoRoot,
    options: route.options
  });
  assertCommandExists(profile, "validateFile");
  const spec = parseValidateFileSpec(route);
  const validation = await validateFiles({
    profile,
    directoryPath: spec.directory,
    repoRoot
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
  const repoRoot = findProjectRoot(cwd);

  try {
    const parsed = parseArgv(argv);
    const route = routeCommand(alias, parsed);

    let payload;
    if (route.action === "help") {
      payload = await handleHelpCommand({
        alias,
        role: route.role,
        route,
        repoRoot
      });
    } else if (route.action === "guide") {
      payload = await handleGuideCommand({
        alias,
        role: route.role,
        route,
        repoRoot
      });
    } else if (route.action === "mode") {
      payload = await handleModeCommand({
        role: route.role,
        route,
        repoRoot
      });
    } else if (route.action === "validate") {
      payload = await handleValidateCommand({
        alias,
        role: route.role,
        route,
        repoRoot
      });
    } else if (route.action === "validateFile") {
      payload = await handleValidateFileCommand({
        alias,
        role: route.role,
        route,
        repoRoot
      });
    } else if (route.action === "batch") {
      payload = await handleBatchCommand({
        alias,
        role: route.role,
        route,
        repoRoot
      });
    } else {
      payload = await handleGenerateCommand({
        alias,
        role: route.role,
        route,
        repoRoot
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
