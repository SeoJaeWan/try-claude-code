import { generateFiles } from "./file-generator.mjs";
import { writeGeneratedFiles } from "./file-writer.mjs";
import { resolveRefs } from "./ref-resolver.mjs";
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

export async function executeBatch({
  profile,
  profileId,
  batchSpec,
  projectRoot,
  apply,
  force
}) {
  const priorResults = {};
  const batchResults = [];
  const collectedFiles = [];

  for (const op of batchSpec.ops) {
    const resolvedSpec = resolveRefs(op.spec, priorResults);
    const opResult = await executeSpecCommand({
      profile,
      profileId,
      commandName: op.command,
      spec: resolvedSpec,
      projectRoot
    });

    const resultWithId = {
      id: op.id,
      ...opResult
    };
    batchResults.push(resultWithId);
    priorResults[op.id] = resultWithId;

    if (opResult.files?.length) {
      for (const file of opResult.files) {
        collectedFiles.push({
          opId: op.id,
          ...file
        });
      }
    }
  }

  const fileWriteResults = await writeGeneratedFiles({
    projectRoot,
    files: collectedFiles.map(({ opId, ...file }) => file),
    dryRun: !apply,
    force
  });
  const fileResultByPath = new Map(fileWriteResults.map((file) => [file.path, file]));

  return {
    ok: true,
    command: "batch",
    profile: profileId,
    apply,
    batchResults: batchResults.map((result) =>
      result.files
        ? {
            ...result,
            files: result.files.map((file) => fileResultByPath.get(file.path) ?? file)
          }
        : result
    ),
    files: fileWriteResults
  };
}
