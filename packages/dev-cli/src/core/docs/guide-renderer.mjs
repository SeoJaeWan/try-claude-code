function formatList(title, values, indent = "") {
  if (!Array.isArray(values) || values.length === 0) {
    return [];
  }

  return [
    `${indent}${title}:`,
    ...values.map((value) => `${indent}  - ${value}`)
  ];
}

function formatGuideEntry(key, value, indent = "") {
  if (value === undefined || value === null) {
    return [];
  }

  if (typeof value === "string") {
    return [`${indent}${key}: ${value}`];
  }

  if (Array.isArray(value)) {
    return formatList(key, value, indent);
  }

  if (typeof value === "object") {
    const lines = [`${indent}${key}:`];
    for (const [childKey, childValue] of Object.entries(value)) {
      lines.push(...formatGuideEntry(childKey, childValue, `${indent}  `));
    }
    return lines;
  }

  return [`${indent}${key}: ${String(value)}`];
}

function summarizeCommand(command) {
  return {
    description: command.description,
    inputMode: command.inputMode,
    executionKind: command.execution?.kind ?? null,
    required: command.inputSchema?.required ?? [],
    requiredAny: command.inputSchema?.requiredAny ?? [],
    outputPattern: command.render?.output?.filePattern ?? null,
    filePatterns: command.render?.fileEntries?.map((entry) => entry.filePattern) ?? [],
    guide: command.guide ?? {},
    examples: command.examples ?? []
  };
}

function formatCommandGuide(name, command) {
  const lines = [
    `[${name}] ${command.description}`
  ];

  if (command.inputMode) {
    lines.push(`  입력방식: ${command.inputMode}`);
  }

  if (command.executionKind) {
    lines.push(`  실행방식: ${command.executionKind}`);
  }

  if (command.required.length > 0) {
    lines.push(`  필수필드: ${command.required.join(", ")}`);
  }

  if (command.requiredAny.length > 0) {
    lines.push("  조건부필수:");
    for (const fields of command.requiredAny) {
      lines.push(`    - ${fields.join(" 또는 ")}`);
    }
  }

  if (command.outputPattern) {
    lines.push(`  출력경로: ${command.outputPattern}`);
  }

  if (command.filePatterns.length > 0) {
    lines.push("  출력파일:");
    for (const filePattern of command.filePatterns) {
      lines.push(`    - ${filePattern}`);
    }
  }

  for (const [key, value] of Object.entries(command.guide ?? {})) {
    lines.push(...formatGuideEntry(key, value, "  "));
  }

  if (command.examples.length > 0) {
    lines.push("  예시:");
    for (const example of command.examples) {
      lines.push(`    - ${example}`);
    }
  }

  return lines.join("\n");
}

export function createGuidePayload({
  alias,
  activeProfile,
  profile,
  commandName
}) {
  const filteredCommands = commandName
    ? Object.fromEntries(
        Object.entries(profile.commands ?? {}).filter(([name]) => name === commandName)
      )
    : profile.commands ?? {};

  const commands = Object.fromEntries(
    Object.entries(filteredCommands).map(([name, command]) => [
      name,
      summarizeCommand(command)
    ])
  );

  return {
    ok: true,
    alias,
    id: profile.id,
    activeProfile,
    guide: profile.guide ?? {},
    commands
  };
}

export function renderGuideText(payload) {
  const lines = [
    `${payload.alias} guide -> ${payload.id}`,
    `mode: ${payload.activeProfile.mode}@${payload.activeProfile.version}`,
    ""
  ];

  for (const [key, value] of Object.entries(payload.guide ?? {})) {
    lines.push(...formatGuideEntry(key, value));
  }

  if (Object.keys(payload.commands ?? {}).length > 0) {
    lines.push("", "명령 가이드:");

    for (const [commandName, command] of Object.entries(payload.commands)) {
      lines.push("", formatCommandGuide(commandName, command));
    }
  }

  return lines.join("\n").trimEnd();
}
