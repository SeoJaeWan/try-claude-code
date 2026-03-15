import { parseArgv } from "./arg-parser.mjs";
import { routeCommand } from "./command-router.mjs";
import { writeProfileSelection } from "./config-store.mjs";
import { errorToPayload } from "./error-formatter.mjs";
import { generateFiles } from "./file-generator.mjs";
import { writeGeneratedFiles } from "./file-writer.mjs";
import { createHelpPayload, renderHelpText } from "./help-renderer.mjs";
import { resolveActiveProfile } from "./mode-resolver.mjs";
import { formatOutput } from "./output.mjs";
import { findRepoRoot } from "./path-utils.mjs";
import { loadActiveProfile } from "./profile-loader.mjs";
import { validateRequest } from "./profile-validator.mjs";

function createSuccessPayload(payload) {
  return {
    ok: true,
    ...payload
  };
}

function normalizeArgs(name, route) {
  return {
    name,
    path: route.options.path,
    kind: route.options.kind,
    basePackage: route.options.basePackage
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
  const args = normalizeArgs(route.name, route);
  const files = await generateFiles({
    role,
    profile,
    commandName: route.commandName,
    args,
    repoRoot
  });
  const writtenFiles = await writeGeneratedFiles({
    repoRoot,
    files,
    dryRun: Boolean(route.options.dryRun),
    force: Boolean(route.options.force)
  });

  return createSuccessPayload({
    alias,
    role,
    action: "generate",
    command: route.commandName,
    activeProfile,
    dryRun: Boolean(route.options.dryRun),
    files: writtenFiles
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
