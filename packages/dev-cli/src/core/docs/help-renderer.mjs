function toCliCommandName(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

const BOOTSTRAP_HELP_SUMMARY = "No active profile is configured.";

function normalizeWhenToUse(command) {
  if (Array.isArray(command.summary?.whenToUse) && command.summary.whenToUse.length > 0) {
    return command.summary.whenToUse;
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
    executionKind: command.execution?.kind ?? null
  };
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
    id: profile.id,
    activeProfile,
    extends: profile.extends ?? [],
    profileSummary: {
      summary: profile.helpSummary?.summary ?? ""
    },
    flows,
    commands
  };
}

function createBootstrapPayload({
  alias
}) {
  const suggestedCommand = `${alias} mode set --mode personal --version v1`;
  const inspectCommand = `${alias} mode show`;

  return {
    ok: true,
    helpMode: "bootstrap",
    alias,
    id: null,
    activeProfile: null,
    configured: false,
    suggestedCommand,
    inspectCommand,
    availableWithoutMode: [
      `${alias} --help`,
      inspectCommand,
      suggestedCommand
    ],
    blockedReason:
      "Guide, generate, and validate commands stay unavailable until an active mode is configured.",
    command: null,
    profileSummary: {
      summary: BOOTSTRAP_HELP_SUMMARY
    }
  };
}

function createDetailPayload({
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
      sanitizeCommand(command)
    ])
  );

  return {
    ok: true,
    helpMode: "detail",
    alias,
    id: profile.id,
    activeProfile,
    extends: profile.extends ?? [],
    rules: profile.rules ?? {},
    commands
  };
}

export function createHelpPayload({
  alias,
  activeProfile,
  profile,
  commandName
}) {
  if (!activeProfile || !profile) {
    return createBootstrapPayload({
      alias
    });
  }

  if (!commandName) {
    return createSummaryPayload({
      alias,
      activeProfile,
      profile
    });
  }

  return createDetailPayload({
    alias,
    activeProfile,
    profile,
    commandName
  });
}
