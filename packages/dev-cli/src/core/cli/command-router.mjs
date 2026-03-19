import { normalizeCommandName } from "./arg-parser.mjs";

const KNOWN_ALIASES = new Set(["tcp", "tcf", "tcb"]);

function normalizeFormat(options) {
  return options.text ? "text" : "json";
}

function normalizeGuideFormat(options) {
  if (options.json === true && options.text !== true) {
    return "json";
  }

  return "text";
}

export function routeCommand(alias, parsed) {
  const [first = ""] = parsed.positionals;
  const format = normalizeFormat(parsed.options);

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
      format,
      commandName: first || parsed.options.command || null,
      options: parsed.options
    };
  }

  if (first === "mode") {
    return {
      action: "mode",
      format,
      modeAction: normalizeCommandName(parsed.positionals[1] ?? "") || "show",
      options: parsed.options
    };
  }

  if (first === "validate") {
    return {
      action: "validate",
      format,
      target: normalizeCommandName(parsed.positionals[1] ?? "") || null,
      options: parsed.options
    };
  }

  if (first === "validateFile") {
    return {
      action: "validateFile",
      format,
      commandName: "validateFile",
      extraPositionals: parsed.positionals.slice(1),
      options: parsed.options
    };
  }

  if (first === "guide") {
    return {
      action: "guide",
      format: normalizeGuideFormat(parsed.options),
      commandName: normalizeCommandName(parsed.positionals[1] ?? "") || null,
      options: parsed.options
    };
  }

  if (first === "batch") {
    return {
      action: "batch",
      format,
      commandName: "batch",
      extraPositionals: parsed.positionals.slice(1),
      options: parsed.options
    };
  }

  return {
    action: "execute",
    format,
    commandName: first,
    extraPositionals: parsed.positionals.slice(1),
    options: parsed.options
  };
}
