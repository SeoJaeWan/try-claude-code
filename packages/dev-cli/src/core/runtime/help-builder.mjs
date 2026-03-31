/**
 * help-builder.mjs
 *
 * Builds help payloads directly from a CliManifest.
 *
 * This module is the manifest-aware replacement for
 * core/docs/help-renderer.mjs.  It does NOT depend on activeProfile,
 * profile-loader, mode-resolver, or any remote/cache resource.
 *
 * Retained surface:
 *   - summary help   (alias --help)
 *   - detail help    (alias <command> --help)
 *
 * Removed surface (not present here):
 *   - bootstrap / unconfigured-profile help
 *   - guide rendering
 *   - --help --text / --help --full
 */

function toCliCommandName(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function normalizeWhenToUse(command) {
  if (Array.isArray(command.summary?.whenToUse) && command.summary.whenToUse.length > 0) {
    return command.summary.whenToUse;
  }

  return command.description ? [command.description] : [];
}

function normalizeRelatedCommands(relatedCommands = []) {
  return relatedCommands
    .map((entry) => {
      const id = typeof entry === "string" ? entry : entry?.id;
      const reason = typeof entry === "string" ? undefined : entry?.reason;
      const command = toCliCommandName(id ?? "");

      return { command, reason };
    })
    .filter((entry) => entry.command);
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

function createSummaryCommandEntry(commandName, command, flows) {
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

function sanitizeCommandForDetail(command) {
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
    ? Object.fromEntries(
        Object.entries({
          ...render,
          snippetTemplatePath: undefined,
          snippetTemplateContent: undefined,
          templatePath: undefined,
          templatePaths: undefined,
          templateContent: undefined,
          templateContents: undefined
        }).filter(([, value]) => value !== undefined)
      )
    : undefined;

  return sanitizedRender ? { ...rest, render: sanitizedRender } : rest;
}

/**
 * Build a summary help payload from a manifest.
 *
 * @param {import("./manifest-types.mjs").CliManifest} manifest
 * @returns {Object}
 */
export function buildSummaryHelp(manifest) {
  const flows = normalizeFlowRegistry(manifest.helpSummary?.flows ?? {});
  const commands = Object.fromEntries(
    Object.entries(manifest.commands).map(([name, command]) => [
      name,
      createSummaryCommandEntry(name, command, flows)
    ])
  );

  return {
    ok: true,
    helpMode: "summary",
    alias: manifest.alias,
    id: manifest.id ?? null,
    profileSummary: {
      summary: manifest.helpSummary?.summary ?? ""
    },
    flows,
    commands
  };
}

/**
 * Build a detail help payload for a specific command from a manifest.
 *
 * @param {import("./manifest-types.mjs").CliManifest} manifest
 * @param {string|null} commandName  - null returns all commands
 * @returns {Object}
 */
export function buildDetailHelp(manifest, commandName) {
  const filteredCommands = commandName
    ? Object.fromEntries(
        Object.entries(manifest.commands).filter(([name]) => name === commandName)
      )
    : manifest.commands;

  const commands = Object.fromEntries(
    Object.entries(filteredCommands).map(([name, command]) => [
      name,
      sanitizeCommandForDetail(command)
    ])
  );

  return {
    ok: true,
    helpMode: "detail",
    alias: manifest.alias,
    id: manifest.id ?? null,
    rules: manifest.rules ?? {},
    commands
  };
}

/**
 * Build the appropriate help payload from a manifest and route info.
 *
 * @param {import("./manifest-types.mjs").CliManifest} manifest
 * @param {string|null} commandName
 * @returns {Object}
 */
export function buildHelpPayload(manifest, commandName) {
  if (!commandName) {
    return buildSummaryHelp(manifest);
  }

  return buildDetailHelp(manifest, commandName);
}
