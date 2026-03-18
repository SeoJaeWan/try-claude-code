import { createCliError } from "./recipe-utils.mjs";

function toCliCommandName(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

const BOOTSTRAP_HELP_BY_ALIAS = {
  tcp: {
    summary: "No active publisher profile is configured. Set one before running publisher commands.",
    commands: {
      mode: {
        description: "Set or show the active publisher profile",
        whenToUse: ["Run this first to select the active remote profile"],
        availableWithoutMode: true
      },
      help: {
        description: "Show bootstrap help and next-step guidance",
        whenToUse: ["Use this to discover commands before setting a profile"],
        availableWithoutMode: true
      },
      component: {
        description: "Generate a publisher UI component file",
        whenToUse: ["Create a new UI component shell after selecting an active profile"]
      },
      uiState: {
        description: "Render UI interaction state and handlers snippet",
        whenToUse: ["Create UI state shells for modal, drawer, or dropdown interactions"]
      },
      type: {
        description: "Render a shared type snippet",
        whenToUse: ["Generate shared type shells used by publisher contracts"]
      },
      props: {
        description: "Render props members only snippet",
        whenToUse: ["Generate props members before wiring a component contract"]
      },
      function: {
        description: "Render a shared function snippet",
        whenToUse: ["Generate shared handler or utility function shells"]
      },
      validateFile: {
        description: "Validate publisher UI files against placement and AST rules",
        whenToUse: ["Verify generated or edited publisher files after setup"]
      },
      batch: {
        description: "Execute multiple publisher ops in one request",
        whenToUse: ["Bundle several publisher operations into one run"]
      },
      guide: {
        description: "Show the active publisher guide",
        whenToUse: ["Read the full profile guide after setting an active profile"]
      }
    }
  },
  tcf: {
    summary: "No active frontend profile is configured. Set one before running frontend commands.",
    commands: {
      mode: {
        description: "Set or show the active frontend profile",
        whenToUse: ["Run this first to select the active remote profile"],
        availableWithoutMode: true
      },
      help: {
        description: "Show bootstrap help and next-step guidance",
        whenToUse: ["Use this to discover commands before setting a profile"],
        availableWithoutMode: true
      },
      hook: {
        description: "Generate a non-API hook file",
        whenToUse: ["Create a frontend hook after selecting an active profile"]
      },
      apiHook: {
        description: "Generate an API hook file",
        whenToUse: ["Create query or mutation hooks after selecting an active profile"]
      },
      type: {
        description: "Render a shared type snippet",
        whenToUse: ["Generate shared frontend type shells"]
      },
      props: {
        description: "Render props members only snippet",
        whenToUse: ["Generate shared props members for hooks or components"]
      },
      function: {
        description: "Render a shared function snippet",
        whenToUse: ["Generate shared handler or utility function shells"]
      },
      queryKey: {
        description: "Render a query key snippet",
        whenToUse: ["Define stable query key shapes"]
      },
      endpoint: {
        description: "Render an endpoint snippet",
        whenToUse: ["Define API endpoint constants or metadata"]
      },
      mapper: {
        description: "Render a mapper snippet",
        whenToUse: ["Create frontend data mapping helpers"]
      },
      hookReturn: {
        description: "Render a hook return snippet",
        whenToUse: ["Define structured hook return contracts"]
      },
      batch: {
        description: "Execute multiple frontend ops in one request",
        whenToUse: ["Bundle several frontend operations into one run"]
      },
      guide: {
        description: "Show the active frontend guide",
        whenToUse: ["Read the full profile guide after setting an active profile"]
      }
    }
  },
  tcb: {
    summary: "No active backend profile is configured. Set one before running backend commands.",
    commands: {
      mode: {
        description: "Set or show the active backend profile",
        whenToUse: ["Run this first to select the active remote profile"],
        availableWithoutMode: true
      },
      help: {
        description: "Show bootstrap help and next-step guidance",
        whenToUse: ["Use this to discover commands before setting a profile"],
        availableWithoutMode: true
      },
      module: {
        description: "Generate a backend feature module",
        whenToUse: ["Create a backend feature package after selecting an active profile"]
      },
      requestDto: {
        description: "Generate a request DTO",
        whenToUse: ["Create backend request payload contracts"]
      },
      responseDto: {
        description: "Generate a response DTO",
        whenToUse: ["Create backend response payload contracts"]
      },
      entity: {
        description: "Generate an entity",
        whenToUse: ["Create backend persistence models"]
      },
      batch: {
        description: "Execute multiple backend ops in one request",
        whenToUse: ["Bundle several backend operations into one run"]
      },
      guide: {
        description: "Show the active backend guide",
        whenToUse: ["Read the full profile guide after setting an active profile"]
      }
    }
  }
};

function createDetailHelp(alias, commandName) {
  return `${alias} ${toCliCommandName(commandName)} --help`;
}

function normalizeWhenToUse(command) {
  if (Array.isArray(command.summary?.whenToUse) && command.summary.whenToUse.length > 0) {
    return command.summary.whenToUse;
  }

  if (typeof command.guide?.목적 === "string" && command.guide.목적.trim().length > 0) {
    return [command.guide.목적.trim()];
  }

  return command.description ? [command.description] : [];
}

function normalizeRelatedCommands(relatedCommands = []) {
  return relatedCommands.map((entry) => {
    const id = typeof entry === "string" ? entry : entry?.id;
    const reason = typeof entry === "string" ? undefined : entry?.reason;
    const command = toCliCommandName(id ?? "");

    return {
      command,
      reason
    };
  }).filter((entry) => entry.command);
}

function normalizeFlowStep(step = {}) {
  return {
    command: toCliCommandName(step.command ?? ""),
    purpose: step.purpose ?? ""
  };
}

function normalizeFlowRegistry(flowRegistry = {}) {
  return Object.fromEntries(
    Object.entries(flowRegistry).map(([flowId, flow]) => [
      flowId,
      {
        title: flow.title ?? flowId,
        summary: flow.summary ?? "",
        steps: Array.isArray(flow.steps)
          ? flow.steps.map((step) => normalizeFlowStep(step))
          : []
      }
    ])
  );
}

function createSummaryCommand(alias, commandName, command, flows) {
  const flowRefs = Array.isArray(command.summary?.flowRefs)
    ? command.summary.flowRefs.filter((flowId) => flowId in flows)
    : [];

  return {
    cliCommand: toCliCommandName(commandName),
    description: command.description ?? "",
    whenToUse: normalizeWhenToUse(command),
    relatedCommands: normalizeRelatedCommands(command.summary?.relatedCommands ?? []),
    flowRefs,
    inputMode: command.inputMode ?? null,
    executionKind: command.execution?.kind ?? null,
    detailHelp: createDetailHelp(alias, commandName)
  };
}

function formatSummaryTextCommand(name, command) {
  const lines = [
    `${command.cliCommand ?? toCliCommandName(name)}: ${command.description}`
  ];

  if (command.whenToUse?.length) {
    lines.push(`  when: ${command.whenToUse.join(" | ")}`);
  }

  if (command.inputMode) {
    lines.push(
      command.inputMode === "json"
        ? "  input: --json"
        : command.inputMode === "positional"
          ? "  input: positional"
          : `  input: ${command.inputMode}`
    );
  }

  if (command.executionKind) {
    lines.push(`  mode: ${command.executionKind}`);
  }

  if (command.relatedCommands?.length) {
    lines.push(
      `  related: ${command.relatedCommands
        .map((entry) => entry.reason ? `${entry.command} (${entry.reason})` : entry.command)
        .join(" | ")}`
    );
  }

  if (command.flowRefs?.length) {
    lines.push(`  flows: ${command.flowRefs.join(" | ")}`);
  }

  if (command.detailHelp) {
    lines.push(`  detail: ${command.detailHelp}`);
  }

  return lines.join("\n");
}

function formatDetailTextCommand(name, command) {
  const lines = [
    `${toCliCommandName(name)}: ${command.description}`
  ];

  const whenToUse = normalizeWhenToUse(command);
  if (whenToUse.length > 0) {
    lines.push(`  when: ${whenToUse.join(" | ")}`);
  }

  const relatedCommands = normalizeRelatedCommands(command.summary?.relatedCommands ?? [])
    .map((entry) => entry.reason ? `${entry.command} (${entry.reason})` : entry.command);
  if (relatedCommands.length > 0) {
    lines.push(`  related: ${relatedCommands.join(" | ")}`);
  }

  const flowRefs = Array.isArray(command.summary?.flowRefs) ? command.summary.flowRefs : [];
  if (flowRefs.length > 0) {
    lines.push(`  flows: ${flowRefs.join(" | ")}`);
  }

  if (command.inputMode) {
    lines.push(
      command.inputMode === "json"
        ? "  input: --json"
        : command.inputMode === "positional"
          ? "  input: positional"
          : `  input: ${command.inputMode}`
    );
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
    const acceptedModes = Array.isArray(inputShape.filesModes)
      ? inputShape.filesModes.join(" | ")
      : Array.isArray(inputShape.acceptedModes)
        ? inputShape.acceptedModes.join(" | ")
        : null;
    lines.push(
      acceptedModes
        ? `  files: ${inputShape.filesField} (${acceptedModes})`
        : `  files: ${inputShape.filesField}`
    );
  }

  if (inputShape.directoryField) {
    const acceptedModes = Array.isArray(inputShape.directoryModes)
      ? inputShape.directoryModes.join(" | ")
      : null;
    lines.push(
      acceptedModes
        ? `  directory: ${inputShape.directoryField} (${acceptedModes})`
        : `  directory: ${inputShape.directoryField}`
    );
  }

  if (inputShape.rootField) {
    const acceptedModes = Array.isArray(inputShape.rootModes)
      ? inputShape.rootModes.join(" | ")
      : null;
    lines.push(
      acceptedModes
        ? `  root: ${inputShape.rootField} (${acceptedModes})`
        : `  root: ${inputShape.rootField}`
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
    templateContent,
    templateContents,
    render,
    ...rest
  } = command;

  const sanitizedRender = render
    ? {
        ...render,
        snippetTemplatePath: undefined,
        snippetTemplateContent: undefined,
        templatePath: undefined,
        templatePaths: undefined,
        templateContent: undefined,
        templateContents: undefined
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

function createSummaryPayload({
  alias,
  role,
  activeProfile,
  profile
}) {
  const flows = normalizeFlowRegistry(profile.helpSummary?.flows ?? {});
  const commands = Object.fromEntries(
    Object.entries(profile.commands ?? {}).map(([name, command]) => [
      name,
      createSummaryCommand(alias, name, command, flows)
    ])
  );

  return {
    ok: true,
    helpMode: "summary",
    alias,
    role,
    id: profile.id,
    activeProfile,
    extends: profile.extends ?? [],
    profileSummary: {
      summary: profile.helpSummary?.summary ?? profile.guide?.요약 ?? ""
    },
    flows,
    commands
  };
}

function createBootstrapPayload({
  alias,
  role,
  commandName
}) {
  const bootstrap = BOOTSTRAP_HELP_BY_ALIAS[alias];
  const suggestedCommand = `${alias} mode set --mode personal --version v1`;

  if (!bootstrap) {
    throw createCliError("UNKNOWN_ALIAS", `Unknown alias: ${alias}`, {
      alias
    });
  }

  if (commandName && !bootstrap.commands[commandName]) {
    throw createCliError("UNKNOWN_COMMAND", `Unknown command: ${commandName}`, {
      command: commandName
    });
  }

  const commandEntries = commandName
    ? [[commandName, bootstrap.commands[commandName]]]
    : Object.entries(bootstrap.commands);
  const commands = Object.fromEntries(
    commandEntries.map(([name, command]) => [
      name,
      {
        cliCommand: toCliCommandName(name),
        description: command.description,
        whenToUse: command.whenToUse ?? [],
        availableWithoutMode: Boolean(command.availableWithoutMode),
        setupRequired: !command.availableWithoutMode,
        detailHelp: createDetailHelp(alias, name)
      }
    ])
  );

  return {
    ok: true,
    helpMode: "bootstrap",
    alias,
    role,
    id: null,
    activeProfile: null,
    configured: false,
    suggestedCommand,
    profileSummary: {
      summary: bootstrap.summary
    },
    commands
  };
}

function createDetailPayload({
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
    helpMode: "detail",
    alias,
    role,
    id: profile.id,
    activeProfile,
    extends: profile.extends ?? [],
    rules: profile.rules ?? {},
    commands
  };
}

export function createHelpPayload({
  alias,
  role,
  activeProfile,
  profile,
  commandName,
  full = false
}) {
  if (!activeProfile || !profile) {
    return createBootstrapPayload({
      alias,
      role,
      commandName
    });
  }

  if (!commandName && !full) {
    return createSummaryPayload({
      alias,
      role,
      activeProfile,
      profile
    });
  }

  return createDetailPayload({
    alias,
    role,
    activeProfile,
    profile,
    commandName
  });
}

export function renderHelpText(payload) {
  const lines = [
    `${payload.alias} -> ${payload.id ?? payload.role}`,
    payload.activeProfile
      ? `mode: ${payload.activeProfile.mode}@${payload.activeProfile.version}`
      : "mode: not configured",
    "default input: --json"
  ];

  if (payload.helpMode === "bootstrap") {
    if (payload.profileSummary?.summary) {
      lines.push(`summary: ${payload.profileSummary.summary}`);
    }
    if (payload.suggestedCommand) {
      lines.push(`setup: ${payload.suggestedCommand}`);
    }

    lines.push("");

    for (const command of Object.values(payload.commands ?? {})) {
      lines.push(`${command.cliCommand}: ${command.description}`);
      if (command.whenToUse?.length) {
        lines.push(`  when: ${command.whenToUse.join(" | ")}`);
      }
      if (command.setupRequired) {
        lines.push(`  setup: run ${payload.suggestedCommand} first`);
      }
      if (command.detailHelp) {
        lines.push(`  detail: ${command.detailHelp}`);
      }
      lines.push("");
    }

    return lines.join("\n").trimEnd();
  }

  if (payload.helpMode === "summary") {
    if (payload.profileSummary?.summary) {
      lines.push(`summary: ${payload.profileSummary.summary}`);
    }

    const flowEntries = Object.entries(payload.flows ?? {});
    if (flowEntries.length > 0) {
      lines.push("", "flows:");
      for (const [flowId, flow] of flowEntries) {
        const stepSummary = flow.steps?.length
          ? ` (${flow.steps.map((step) => step.command).join(" -> ")})`
          : "";
        lines.push(`  ${flowId}: ${flow.title}${stepSummary}`);
        if (flow.summary) {
          lines.push(`    ${flow.summary}`);
        }
      }
    }

    lines.push("");

    for (const [commandName, command] of Object.entries(payload.commands ?? {})) {
      lines.push(formatSummaryTextCommand(commandName, command));
      lines.push("");
    }

    return lines.join("\n").trimEnd();
  }

  lines.push("");

  for (const [commandName, command] of Object.entries(payload.commands ?? {})) {
    lines.push(formatDetailTextCommand(commandName, command));
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
