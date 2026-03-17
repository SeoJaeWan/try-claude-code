function toCamelOptionName(name) {
  return name.replace(/-([a-z])/g, (_, value) => value.toUpperCase());
}

export function normalizeCommandName(name) {
  const normalized = name ?? "";
  return normalized.replace(/-([a-z])/g, (_, value) => value.toUpperCase());
}

export function parseArgv(argv) {
  const options = {};
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }

    const rawName = token.slice(2);
    const optionName = toCamelOptionName(rawName);
    const next = argv[index + 1];

    if (next && !next.startsWith("--")) {
      options[optionName] = next;
      index += 1;
      continue;
    }

    options[optionName] = true;
  }

  return {
    options,
    positionals: positionals.map((value, index) =>
      index === 0 ? normalizeCommandName(value) : value
    )
  };
}
