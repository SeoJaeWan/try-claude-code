import { generateFiles } from "./file-generator.mjs";
import { normalizeSpec, renderSnippet } from "./spec-normalizer.mjs";

function createCliError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

export async function executeSpecCommand({
  profile,
  profileId,
  commandName,
  spec,
  projectRoot
}) {
  const baseCommand = profile.commands?.[commandName];
  const command = baseCommand
    ? {
        name: commandName,
        ...baseCommand
      }
    : null;
  if (!command) {
    throw createCliError("UNKNOWN_COMMAND", `Unknown command: ${commandName}`, {
      command: commandName,
      profile: profileId
    });
  }

  const { normalizedSpec, normalizations } = normalizeSpec({
    command,
    spec
  });

  if ((command.execution?.kind ?? "file") === "snippet") {
    const result = await renderSnippet({
      command,
      normalizedSpec
    });

    return {
      ok: true,
      command: commandName,
      profile: profileId,
      normalizedSpec,
      normalizations,
      result
    };
  }

  const files = await generateFiles({
    profile,
    commandName,
    args: normalizedSpec,
    projectRoot
  });

  return {
    ok: true,
    command: commandName,
    profile: profileId,
    normalizedSpec,
    normalizations,
    files
  };
}
