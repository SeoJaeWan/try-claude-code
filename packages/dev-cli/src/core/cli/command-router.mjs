import { normalizeCommandName } from "./arg-parser.mjs";

const KNOWN_ALIASES = new Set(["frontend", "backend"]);

export function routeCommand(alias, parsed) {
  const [first = ""] = parsed.positionals;

  if (!KNOWN_ALIASES.has(alias)) {
    const error = new Error(`Unknown alias: ${alias}`);
    error.code = "UNKNOWN_ALIAS";
    throw error;
  }

  if (first === "help" || first === "describe") {
    const error = new Error(`Unknown command: ${first}`);
    error.code = "UNKNOWN_COMMAND";
    error.details = {
      command: first
    };
    throw error;
  }

  if (parsed.options.help || first === "") {
    return {
      action: "help",
      format: "json",
      commandName: first || parsed.options.command || null,
      options: parsed.options
    };
  }

  if (first === "mode") {
    return {
      action: "mode",
      format: "json",
      modeAction: normalizeCommandName(parsed.positionals[1] ?? "") || "show",
      options: parsed.options
    };
  }

  if (first === "validate") {
    return {
      action: "validate",
      format: "json",
      target: normalizeCommandName(parsed.positionals[1] ?? "") || null,
      options: parsed.options
    };
  }

  if (first === "validateFile") {
    return {
      action: "validateFile",
      format: "json",
      commandName: "validateFile",
      extraPositionals: parsed.positionals.slice(1),
      options: parsed.options
    };
  }

  if (first === "batch") {
    return {
      action: "batch",
      format: "json",
      commandName: "batch",
      extraPositionals: parsed.positionals.slice(1),
      options: parsed.options
    };
  }

  return {
    action: "execute",
    format: "json",
    commandName: first,
    extraPositionals: parsed.positionals.slice(1),
    options: parsed.options
  };
}
