import { normalizeCommandName } from "./arg-parser.mjs";

const ROLE_BY_ALIAS = {
  tcp: "publisher",
  tcf: "frontend",
  tcb: "backend"
};

function normalizeFormat(options) {
  return options.text ? "text" : "json";
}

function normalizeGuideFormat(options) {
  if (options.json === true && options.text !== true) {
    return "json";
  }

  return "text";
}

export function getRoleForAlias(alias) {
  return ROLE_BY_ALIAS[alias] ?? null;
}

export function routeCommand(alias, parsed) {
  const role = getRoleForAlias(alias);
  const [first = ""] = parsed.positionals;
  const format = normalizeFormat(parsed.options);

  if (!role) {
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
      role,
      action: "help",
      format,
      commandName: first || parsed.options.command || null,
      options: parsed.options
    };
  }

  if (first === "mode") {
    return {
      role,
      action: "mode",
      format,
      modeAction: normalizeCommandName(parsed.positionals[1] ?? "") || "show",
      options: parsed.options
    };
  }

  if (first === "validate") {
    return {
      role,
      action: "validate",
      format,
      target: normalizeCommandName(parsed.positionals[1] ?? "") || null,
      options: parsed.options
    };
  }

  if (first === "validateFile") {
    return {
      role,
      action: "validateFile",
      format,
      commandName: "validateFile",
      extraPositionals: parsed.positionals.slice(1),
      options: parsed.options
    };
  }

  if (first === "guide") {
    return {
      role,
      action: "guide",
      format: normalizeGuideFormat(parsed.options),
      commandName: normalizeCommandName(parsed.positionals[1] ?? "") || null,
      options: parsed.options
    };
  }

  if (first === "batch") {
    return {
      role,
      action: "batch",
      format,
      commandName: "batch",
      extraPositionals: parsed.positionals.slice(1),
      options: parsed.options
    };
  }

  return {
    role,
    action: "execute",
    format,
    commandName: first,
    extraPositionals: parsed.positionals.slice(1),
    options: parsed.options
  };
}
