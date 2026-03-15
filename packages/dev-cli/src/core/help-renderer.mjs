function formatTextCommand(name, command) {
  const lines = [
    `${name}: ${command.description}`
  ];

  if (command.inputMode === "json") {
    lines.push("  input: --json");
  }

  if (command.execution?.kind) {
    lines.push(`  mode: ${command.execution.kind}`);
  }

  if (command.render?.output?.filePattern) {
    lines.push(`  output: ${command.render.output.filePattern}`);
  }

  const requiredArgs = Object.entries(command.arguments ?? {})
    .filter(([, argument]) => argument.required)
    .map(([argumentName]) => argumentName);

  if (requiredArgs.length > 0) {
    lines.push(`  required: ${requiredArgs.join(", ")}`);
  }

  if (command.examples?.length) {
    lines.push("  examples:");
    for (const example of command.examples) {
      lines.push(`    - ${example}`);
    }
  }

  return lines.join("\n");
}

function sanitizeCommand(command) {
  const {
    templatePath,
    templatePaths,
    render,
    ...rest
  } = command;

  const sanitizedRender = render
    ? {
        ...render,
        snippetTemplatePath: undefined,
        templatePath: undefined,
        templatePaths: undefined
      }
    : undefined;

  return sanitizedRender
    ? {
        ...rest,
        render: Object.fromEntries(
          Object.entries(sanitizedRender).filter(([, value]) => value !== undefined)
        )
      }
    : rest;
}

export function createHelpPayload({
  alias,
  role,
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
      sanitizeCommand(command)
    ])
  );

  return {
    ok: true,
    alias,
    role,
    id: profile.id,
    activeProfile,
    extends: profile.extends ?? [],
    rules: profile.rules ?? {},
    commands
  };
}

export function renderHelpText(payload) {
  const lines = [
    `${payload.alias} -> ${payload.id}`,
    `mode: ${payload.activeProfile.mode}@${payload.activeProfile.version}`,
    "default input: --json",
    ""
  ];

  for (const [commandName, command] of Object.entries(payload.commands ?? {})) {
    lines.push(formatTextCommand(commandName, command));
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
