function createCliError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

function parseJson(rawValue, commandName) {
  if (typeof rawValue !== "string" || rawValue.trim() === "") {
    throw createCliError(
      "JSON_SPEC_REQUIRED",
      `Command ${commandName} requires --json with a valid JSON object.`,
      {
        command: commandName
      }
    );
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    throw createCliError(
      "INVALID_JSON_SPEC",
      `Command ${commandName} received invalid JSON.`,
      {
        command: commandName,
        reason: error instanceof Error ? error.message : String(error)
      }
    );
  }
}

export function parseCommandSpec(route) {
  if (route.extraPositionals?.length) {
    throw createCliError(
      "JSON_SPEC_REQUIRED",
      `Command ${route.commandName} does not accept positional spec values. Use --json.`,
      {
        command: route.commandName,
        positionals: route.extraPositionals
      }
    );
  }

  const parsed = parseJson(route.options.json, route.commandName);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw createCliError(
      "INVALID_JSON_SPEC",
      `Command ${route.commandName} expects a JSON object.`,
      {
        command: route.commandName
      }
    );
  }

  return parsed;
}

export function parseValidateFileSpec(route) {
  if (!route.extraPositionals?.length) {
    throw createCliError(
      "VALIDATE_FILE_SPEC_REQUIRED",
      "Command validate-file requires exactly one directory path.",
      {
        command: "validate-file"
      }
    );
  }

  if (route.extraPositionals.length !== 1) {
    throw createCliError(
      "INVALID_VALIDATE_FILE_SPEC",
      "Command validate-file accepts exactly one directory path.",
      {
        command: "validate-file",
        positionals: route.extraPositionals
      }
    );
  }

  return {
    directory: route.extraPositionals[0]
  };
}
