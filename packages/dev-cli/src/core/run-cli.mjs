import { parseArgv } from "./arg-parser.mjs";
import { executeBatch, executeSpecCommand } from "./batch-executor.mjs";
import { routeCommand } from "./command-router.mjs";
import { writeProfileSelection } from "./config-store.mjs";
import { errorToPayload } from "./error-formatter.mjs";
import { writeGeneratedFiles } from "./file-writer.mjs";
import { createHelpPayload, renderHelpText } from "./help-renderer.mjs";
import { resolveActiveProfile } from "./mode-resolver.mjs";
import { formatOutput } from "./output.mjs";
import { findRepoRoot } from "./path-utils.mjs";
import { loadActiveProfile } from "./profile-loader.mjs";
import { validateRequest } from "./profile-validator.mjs";
import { parseBatchSpec, parseCommandSpec } from "./spec-parser.mjs";

function createSuccessPayload(payload) {
  return {
    ok: true,
    ...payload
  };
}

async function handleModeCommand({ role, route, repoRoot }) {
  if (route.modeAction === "show") {
    const activeProfile = await resolveActiveProfile({
      role,
      repoRoot,
      options: route.options
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

  if (!route.options.version && !String(route.options.mode).includes("@")) {
    const error = new Error("Missing required option: --version");
    error.code = "MISSING_ARGUMENT";
    error.details = {
      argument: "version"
    };
    throw error;
  }

  const [mode, inlineVersion] = String(route.options.mode).split("@");
  const version = inlineVersion ?? route.options.version;
  const scope = route.options.repo ? "repo" : "global";

  const saved = await writeProfileSelection({
    scope,
    repoRoot,
    role,
    mode,
    version
  });

  return createSuccessPayload({
    role,
    action: "mode",
    saved
  });
}

async function handleHelpCommand({ alias, role, route, repoRoot }) {
  const activeProfile = await resolveActiveProfile({
    role,
    repoRoot,
    options: route.options
  });
  const { profile } = await loadActiveProfile({
    repoRoot,
    role,
    mode: activeProfile.mode,
    version: activeProfile.version
  });
  const payload = createHelpPayload({
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
      payload: renderHelpText(payload)
    };
  }

  return payload;
}

async function handleGenerateCommand({ alias, role, route, repoRoot }) {
  const activeProfile = await resolveActiveProfile({
    role,
    repoRoot,
    options: route.options
  });
  const { profile } = await loadActiveProfile({
    repoRoot,
    role,
    mode: activeProfile.mode,
    version: activeProfile.version
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
  const activeProfile = await resolveActiveProfile({
    role,
    repoRoot,
    options: route.options
  });
  const { profile } = await loadActiveProfile({
    repoRoot,
    role,
    mode: activeProfile.mode,
    version: activeProfile.version
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
  const activeProfile = await resolveActiveProfile({
    role,
    repoRoot,
    options: route.options
  });
  const { profile } = await loadActiveProfile({
    repoRoot,
    role,
    mode: activeProfile.mode,
    version: activeProfile.version
  });
  const checks = await validateRequest({
    role,
    profile,
    commandName: route.target ?? route.options.command ?? "validate",
    args: {
      name: route.options.name,
      path: route.options.path,
      kind: route.options.kind,
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

export async function runCli({
  alias,
  argv = process.argv.slice(2),
  cwd = process.cwd(),
  stdout = process.stdout,
  stderr = process.stderr
}) {
  const repoRoot = findRepoRoot(cwd);

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
