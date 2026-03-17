import { createGuidePayload } from "./guide-renderer.mjs";
import { createHelpPayload } from "./help-renderer.mjs";

function isPopulated(value) {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "object") {
    return Object.keys(value).length > 0;
  }

  return true;
}

function createGroup(id, title, value, extra = {}) {
  if (!isPopulated(value)) {
    return null;
  }

  return {
    id,
    title,
    value,
    ...extra
  };
}

function sanitizeRender(render = {}) {
  const {
    templatePath,
    templatePaths,
    snippetTemplatePath,
    ...rest
  } = render ?? {};

  return Object.fromEntries(
    Object.entries(rest).filter(([, value]) => value !== undefined && isPopulated(value))
  );
}

function createSectionMeta(guideCommand = {}) {
  const meta = {
    inputMode: guideCommand.inputMode ?? null,
    executionKind: guideCommand.executionKind ?? null,
    required: guideCommand.required ?? [],
    requiredAny: guideCommand.requiredAny ?? [],
    outputPattern: guideCommand.outputPattern ?? null,
    filePatterns: guideCommand.filePatterns ?? []
  };

  return Object.fromEntries(
    Object.entries(meta).filter(([, value]) => isPopulated(value))
  );
}

function stripSummaryField(guide = {}) {
  return Object.fromEntries(
    Object.entries(guide ?? {}).filter(([key, value]) => key !== "요약" && isPopulated(value))
  );
}

function createCommandSections(profile, guidePayload, helpPayload) {
  return Object.entries(profile.commands ?? {}).map(([commandName, rawCommand]) => {
    const guideCommand = guidePayload.commands?.[commandName] ?? {};
    const helpCommand = helpPayload.commands?.[commandName] ?? {};
    const renderValue = sanitizeRender(rawCommand.render ?? helpCommand.render);
    const groups = [
      createGroup("guide", "Guide", guideCommand.guide ?? {}),
      createGroup("contracts", "Contracts", helpCommand.contracts ?? {}),
      createGroup("fieldResolvers", "Field Resolvers", rawCommand.fieldResolvers ?? []),
      createGroup("targets", "Validate Targets", rawCommand.targetRules ?? []),
      createGroup("normalization", "Normalization", rawCommand.normalizationRules ?? []),
      createGroup("validators", "Validators", rawCommand.validatorRules ?? []),
      createGroup("render", "Render", renderValue),
      createGroup("examples", "Examples", guideCommand.examples ?? [], {
        kind: "examples"
      })
    ].filter(Boolean);

    return {
      id: commandName,
      title: commandName,
      description: guideCommand.description ?? rawCommand.description ?? "",
      meta: createSectionMeta(guideCommand),
      groups
    };
  });
}

export function createPublisherGuideModel({
  alias,
  role,
  activeProfile,
  profile
}) {
  const guidePayload = createGuidePayload({
    alias,
    role,
    activeProfile,
    profile,
    commandName: null
  });
  const helpPayload = createHelpPayload({
    alias,
    role,
    activeProfile,
    profile,
    commandName: null,
    full: true
  });
  const summary = profile.guide?.요약 ?? `${profile.id} guide`;

  return {
    readOnly: true,
    profile: {
      alias,
      role,
      id: profile.id,
      mode: activeProfile.mode,
      version: activeProfile.version,
      summary,
      groups: [
        createGroup("guide", "Profile Guide", stripSummaryField(guidePayload.guide)),
        createGroup("rules", "Rules", helpPayload.rules ?? {})
      ].filter(Boolean)
    },
    sections: createCommandSections(profile, guidePayload, helpPayload)
  };
}
