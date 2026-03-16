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

  const requiredArgs = command.inputSchema?.required ?? [];

  if (requiredArgs.length > 0) {
    lines.push(`  required: ${requiredArgs.join(", ")}`);
  }

  const requiredAny = command.inputSchema?.requiredAny ?? [];
  if (requiredAny.length > 0) {
    lines.push(
      ...requiredAny.map((fields) => `  required any: ${fields.join(" | ")}`)
    );
  }

  const contractLines = formatContractHints(command.contracts);
  if (contractLines.length > 0) {
    lines.push(...contractLines);
  }

  if (command.examples?.length) {
    lines.push("  examples:");
    for (const example of command.examples) {
      lines.push(`    - ${example}`);
    }
  }

  return lines.join("\n");
}

function formatContractHints(contracts = {}) {
  const lines = [];
  const inputShape = contracts.inputShape ?? {};
  if (inputShape.filesField) {
    const acceptedModes = Array.isArray(inputShape.acceptedModes)
      ? inputShape.acceptedModes.join(" | ")
      : null;
    lines.push(
      acceptedModes
        ? `  files: ${inputShape.filesField} (${acceptedModes})`
        : `  files: ${inputShape.filesField}`
    );
  }

  const pathPolicy = contracts.pathPolicy ?? {};
  const pathPatterns = pathPolicy.requiredPatterns ?? pathPolicy.allowedPatterns ?? [];
  if (pathPatterns.length > 0) {
    lines.push(`  path policy: ${pathPatterns.join(" | ")}`);
  }

  if (pathPolicy.sharedPattern || pathPolicy.domainPattern) {
    const parts = [];
    if (pathPolicy.sharedPattern) {
      parts.push(`shared=${pathPolicy.sharedPattern}`);
    }
    if (pathPolicy.domainPattern) {
      parts.push(`domain=${pathPolicy.domainPattern}`);
    }
    lines.push(`  placement: ${parts.join(" | ")}`);
  }

  if (pathPolicy.domainPolicy) {
    lines.push(`  domain: ${pathPolicy.domainPolicy}`);
  }

  if (pathPolicy.placementDecision) {
    lines.push(`  choose path: ${pathPolicy.placementDecision}`);
  }

  if (pathPolicy.legacyPolicy) {
    lines.push(`  legacy: ${pathPolicy.legacyPolicy}`);
  }

  const methodPolicy = contracts.methodPolicy ?? {};
  const queryMethod = methodPolicy.query?.requiredMethod;
  const mutationMethods = methodPolicy.mutation?.allowedMethods ?? [];
  if (queryMethod) {
    const mutationSummary = mutationMethods.length > 0
      ? `, mutation=${mutationMethods.join("/")}`
      : "";
    lines.push(`  methods: query=${queryMethod}${mutationSummary}`);
  }

  const namingPolicy = contracts.namingPolicy ?? {};
  const namingPatterns = [
    namingPolicy.requiredPattern,
    namingPolicy.queryPattern,
    ...Object.values(namingPolicy.mutationPatterns ?? {})
  ].filter(Boolean);
  if (namingPatterns.length > 0) {
    lines.push(`  naming: ${namingPatterns.join(" | ")}`);
  }

  const outputPolicy = contracts.outputPolicy ?? {};
  if (outputPolicy.functionStyle) {
    lines.push(`  function: ${outputPolicy.functionStyle}`);
  }
  if (outputPolicy.entryFilePattern) {
    lines.push(`  entry file: ${outputPolicy.entryFilePattern}`);
  }
  if (outputPolicy.defaultExport === true) {
    lines.push("  export: default");
  }
  if (outputPolicy.propsInterfaceSuffix) {
    lines.push(`  props: *${outputPolicy.propsInterfaceSuffix}`);
  }

  const logicBoundary = contracts.logicBoundary ?? {};
  if (logicBoundary.allowedState) {
    lines.push(`  state: ${logicBoundary.allowedState}`);
  }
  if ((logicBoundary.forbiddenPatterns ?? []).length > 0) {
    lines.push(`  forbidden: ${logicBoundary.forbiddenPatterns.join(", ")}`);
  }

  const validationCoverage = contracts.validationCoverage ?? [];
  if (validationCoverage.length > 0) {
    lines.push(`  validates: ${validationCoverage.join(" | ")}`);
  }

  return lines;
}

function sanitizeCommand(command) {
  const {
    guide,
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
