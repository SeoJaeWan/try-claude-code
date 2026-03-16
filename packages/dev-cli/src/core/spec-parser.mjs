import { normalizeCommandName } from "./arg-parser.mjs";

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

export function parseBatchSpec(route) {
  if (route.extraPositionals?.length) {
    throw createCliError(
      "JSON_SPEC_REQUIRED",
      "Batch does not accept positional values. Use --json.",
      {
        command: "batch",
        positionals: route.extraPositionals
      }
    );
  }

  const parsed = parseJson(route.options.json, "batch");
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw createCliError("INVALID_BATCH_SPEC", "Batch expects a JSON object.");
  }

  if (!Array.isArray(parsed.ops) || parsed.ops.length === 0) {
    throw createCliError(
      "INVALID_BATCH_SPEC",
      "Batch requires a non-empty ops array."
    );
  }

  const ids = new Set();
  const ops = parsed.ops.map((op, index) => {
    if (!op || typeof op !== "object" || Array.isArray(op)) {
      throw createCliError("INVALID_BATCH_OP", "Each batch op must be an object.", {
        index
      });
    }

    const id = typeof op.id === "string" && op.id.trim() ? op.id.trim() : null;
    const commandName = normalizeCommandName(op.command);
    if (!id) {
      throw createCliError("INVALID_BATCH_OP", "Each batch op requires an id.", {
        index
      });
    }

    if (ids.has(id)) {
      throw createCliError("DUPLICATE_OP_ID", `Duplicate batch op id: ${id}`, {
        id
      });
    }
    ids.add(id);

    if (!commandName) {
      throw createCliError("INVALID_BATCH_OP", "Each batch op requires a command.", {
        id
      });
    }

    if (!op.spec || typeof op.spec !== "object" || Array.isArray(op.spec)) {
      throw createCliError(
        "INVALID_BATCH_OP",
        "Each batch op requires a spec object.",
        {
          id
        }
      );
    }

    return {
      id,
      command: commandName,
      spec: op.spec
    };
  });

  return {
    ops
  };
}

export function parseValidateFileSpec(route) {
  if (route.options.json) {
    const parsed = parseJson(route.options.json, "validate-file");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw createCliError(
        "INVALID_JSON_SPEC",
        "Command validate-file expects a JSON object.",
        {
          command: "validate-file"
        }
      );
    }

    if (!Array.isArray(parsed.files) || parsed.files.length === 0) {
      throw createCliError(
        "INVALID_VALIDATE_FILE_SPEC",
        "Command validate-file requires a non-empty files array.",
        {
          command: "validate-file"
        }
      );
    }

    return {
      files: parsed.files
    };
  }

  if (!route.extraPositionals?.length) {
    throw createCliError(
      "VALIDATE_FILE_SPEC_REQUIRED",
      "Command validate-file requires one or more file paths or --json.",
      {
        command: "validate-file"
      }
    );
  }

  return {
    files: route.extraPositionals
  };
}
