import { generateFiles } from "./file-generator.mjs";
import { normalizeSpec, renderSnippet } from "./spec-normalizer.mjs";

function createCliError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

export async function executeSpecCommand({
  manifest,
  commandName,
  spec,
  projectRoot
}) {
  const baseCommand = manifest.commands?.[commandName];
  const command = baseCommand
    ? {
        name: commandName,
        ...baseCommand
      }
    : null;
  if (!command) {
    throw createCliError("UNKNOWN_COMMAND", `Unknown command: ${commandName}`, {
      command: commandName,
      alias: manifest.alias
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
      normalizedSpec,
      normalizations,
      result
    };
  }

  const files = await generateFiles({
    profile: manifest,
    commandName,
    args: normalizedSpec,
    projectRoot
  });

  return {
    ok: true,
    command: commandName,
    normalizedSpec,
    normalizations,
    files
  };
}
