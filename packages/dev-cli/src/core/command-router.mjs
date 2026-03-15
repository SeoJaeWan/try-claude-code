const ROLE_BY_ALIAS = {
  tcp: "publisher",
  tcf: "frontend",
  tcb: "backend"
};

function normalizeFormat(options) {
  return options.text ? "text" : "json";
}

export function getRoleForAlias(alias) {
  return ROLE_BY_ALIAS[alias] ?? null;
}

export function routeCommand(alias, parsed) {
  const role = getRoleForAlias(alias);
  const [first = "", second = "", third = ""] = parsed.positionals;
  const format = normalizeFormat(parsed.options);

  if (!role) {
    const error = new Error(`Unknown alias: ${alias}`);
    error.code = "UNKNOWN_ALIAS";
    throw error;
  }

  if (parsed.options.help || first === "" || first === "help") {
    return {
      role,
      action: "help",
      format,
      commandName: first === "help" ? second : first || parsed.options.command || null,
      options: parsed.options
    };
  }

  if (first === "mode") {
    return {
      role,
      action: "mode",
      format,
      modeAction: second || "show",
      options: parsed.options
    };
  }

  if (first === "validate") {
    return {
      role,
      action: "validate",
      format,
      target: second || null,
      options: parsed.options
    };
  }

  if (first === "describe") {
    return {
      role,
      action: "help",
      format,
      commandName: second || null,
      options: parsed.options
    };
  }

  return {
    role,
    action: "generate",
    format,
    commandName: first,
    name: second || parsed.options.name || null,
    extraArg: third || null,
    options: parsed.options
  };
}
