import { renderTemplateFile } from "./template-engine.mjs";
import { buildRenderContext } from "./render-context.mjs";
import {
  applyCaseTransform,
  createCliError,
  ensureArray,
  ensureObject,
  ensureString,
  getNestedValue,
  getPolicyValue,
  mergeDefaults,
  normalizePathField,
  prependPrefix,
  pushNormalization,
  setNestedValue
} from "./recipe-utils.mjs";

function validateInputSchema(command, spec) {
  const schema = command.inputSchema ?? {};

  for (const field of schema.required ?? []) {
    if (getNestedValue(spec, field) === undefined) {
      throw createCliError("INVALID_SPEC", `Missing required field: ${field}`, {
        field,
        command: command.name
      });
    }
  }

  for (const fields of schema.requiredAny ?? []) {
    const hasValue = fields.some((field) => {
      const value = getNestedValue(spec, field);
      return value !== undefined && value !== null && value !== "";
    });

    if (!hasValue) {
      throw createCliError(
        "INVALID_SPEC",
        `One of these fields is required: ${fields.join(", ")}`,
        {
          fields,
          command: command.name
        }
      );
    }
  }

  for (const field of schema.arrays ?? []) {
    const value = getNestedValue(spec, field);
    if (value !== undefined) {
      ensureArray(value, field);
    }
  }

  for (const [field, allowedValues] of Object.entries(schema.enums ?? {})) {
    const value = getNestedValue(spec, field);
    if (value !== undefined && !allowedValues.includes(value)) {
      throw createCliError(
        "INVALID_SPEC",
        `Field ${field} must be one of: ${allowedValues.join(", ")}.`,
        {
          field,
          value,
          allowedValues
        }
      );
    }
  }
}

function normalizeMainField(rule, spec, normalizations) {
  const rawValue = ensureString(getNestedValue(spec, rule.field), rule.field);
  const normalizedValue = applyCaseTransform(rawValue, rule.style);
  pushNormalization(
    normalizations,
    rule.field,
    rawValue,
    normalizedValue,
    rule.reason ?? `field ${rule.field} uses ${rule.style}`
  );
  setNestedValue(spec, rule.field, normalizedValue);
}

function normalizePathRule(rule, spec) {
  const normalized = normalizePathField(getNestedValue(spec, rule.field), rule.field);
  setNestedValue(spec, rule.field, normalized);
}

function normalizePrefixedName(rule, command, spec, normalizations) {
  const rawValue = ensureString(getNestedValue(spec, rule.field), rule.field);
  const prefix = getPolicyValue(command, "prefixes", rule.prefixKey, "");
  const normalizedValue = rawValue.startsWith(prefix)
    ? `${prefix}${applyCaseTransform(rawValue.slice(prefix.length), rule.style)}`
    : prependPrefix(rawValue, prefix, rule.style);

  pushNormalization(
    normalizations,
    rule.field,
    rawValue,
    normalizedValue,
    rule.reason ?? `${rule.field} uses ${prefix}*`
  );
  setNestedValue(spec, rule.field, normalizedValue);
}

function normalizeIntentName(rule, command, spec, normalizations) {
  const intent = spec[rule.intentField];
  const intentRule = rule.intents?.[intent];
  if (!intentRule) {
    throw createCliError("INVALID_SPEC", `Unsupported intent: ${intent}`, {
      intent,
      field: rule.intentField,
      command: command.name
    });
  }

  const rawName = spec[rule.field];
  const rawAction = rule.actionField ? spec[rule.actionField] : undefined;
  if (rawName === undefined && rawAction === undefined) {
    throw createCliError("INVALID_SPEC", `Missing or invalid field: ${rule.field}`, {
      field: rule.field,
      command: command.name
    });
  }

  const prefix = intentRule.prefixKey
    ? getPolicyValue(command, "prefixes", intentRule.prefixKey, "")
    : "";

  const expectedFromAction = rawAction
    ? `${prefix}${applyCaseTransform(ensureString(rawAction, rule.actionField), intentRule.style)}`
    : null;

  let normalizedValue;
  if (rawName !== undefined) {
    const trimmedName = ensureString(rawName, rule.field);
    const alternatePrefixes = (intentRule.stripPrefixKeys ?? [])
      .map((key) => getPolicyValue(command, "prefixes", key, ""))
      .filter(Boolean);

    const matchedAlternatePrefix = alternatePrefixes.find((candidate) =>
      trimmedName.startsWith(candidate)
    );

    if (prefix && trimmedName.startsWith(prefix)) {
      normalizedValue = `${prefix}${applyCaseTransform(trimmedName.slice(prefix.length), intentRule.style)}`;
    } else if (matchedAlternatePrefix) {
      normalizedValue = `${prefix}${applyCaseTransform(trimmedName.slice(matchedAlternatePrefix.length), intentRule.style)}`;
    } else if (prefix) {
      normalizedValue = `${prefix}${applyCaseTransform(trimmedName, intentRule.style)}`;
    } else {
      normalizedValue = applyCaseTransform(trimmedName, intentRule.style);
    }
  } else {
    normalizedValue = expectedFromAction;
  }

  if (expectedFromAction && normalizedValue !== expectedFromAction) {
    throw createCliError(
      "SPEC_CONFLICT",
      `${rule.field} and ${rule.actionField} conflict for ${intent}.`,
      {
        name: rawName,
        action: rawAction,
        intent
      }
    );
  }

  if (rawName !== undefined) {
    pushNormalization(
      normalizations,
      rule.field,
      rawName,
      normalizedValue,
      intentRule.reason ?? `${rule.field} uses ${prefix}*`
    );
  }

  setNestedValue(spec, rule.field, normalizedValue);
}

function normalizeMembersRule(rule, command, spec, normalizations) {
  const members = ensureArray(getNestedValue(spec, rule.field) ?? [], rule.field);
  const callbackPrefix = getPolicyValue(
    command,
    "prefixes",
    rule.callbackPrefixKey,
    "on"
  );

  const normalizedMembers = members.map((member, index) => {
    ensureObject(member, `${rule.field}[${index}]`);
    if (member.kind === "callback") {
      const rawName = ensureString(member.name ?? member.action, `${rule.field}[${index}].name`);
      const normalizedName = rawName.startsWith(callbackPrefix)
        ? `${callbackPrefix}${applyCaseTransform(rawName.slice(callbackPrefix.length), rule.callbackCase)}`
        : rawName.startsWith("handle")
          ? `${callbackPrefix}${rawName.slice("handle".length)}`
          : `${callbackPrefix}${applyCaseTransform(rawName, rule.callbackCase)}`;

      pushNormalization(
        normalizations,
        `${rule.field}[${index}].name`,
        rawName,
        normalizedName,
        rule.callbackReason ?? `callbacks use ${callbackPrefix}*`
      );

      return {
        kind: "callback",
        name: normalizedName,
        params: Array.isArray(member.params) ? member.params : [],
        required: Boolean(member.required),
        returns: member.returns ?? "void"
      };
    }

    const rawName = ensureString(member.name, `${rule.field}[${index}].name`);
    const normalizedName = applyCaseTransform(rawName, rule.valueCase);
    pushNormalization(
      normalizations,
      `${rule.field}[${index}].name`,
      rawName,
      normalizedName,
      rule.valueReason ?? `members use ${rule.valueCase}`
    );

    return {
      kind: "value",
      name: normalizedName,
      type: ensureString(member.type, `${rule.field}[${index}].type`),
      required: Boolean(member.required)
    };
  });

  setNestedValue(spec, rule.field, normalizedMembers);
}

function normalizeListItemNames(rule, spec, normalizations) {
  const items = ensureArray(getNestedValue(spec, rule.field) ?? [], rule.field);
  const normalizedItems = items.map((item, index) => {
    ensureObject(item, `${rule.field}[${index}]`);
    const rawName = ensureString(item.name, `${rule.field}[${index}].name`);
    const normalizedName = applyCaseTransform(rawName, rule.style);
    pushNormalization(
      normalizations,
      `${rule.field}[${index}].name`,
      rawName,
      normalizedName,
      rule.reason ?? `${rule.field} item names use ${rule.style}`
    );

    return {
      ...item,
      name: normalizedName
    };
  });

  setNestedValue(spec, rule.field, normalizedItems);
}

function normalizeStringList(rule, spec, normalizations) {
  const items = ensureArray(getNestedValue(spec, rule.field) ?? [], rule.field);
  const normalizedItems = items.map((item, index) => {
    const rawValue = ensureString(item, `${rule.field}[${index}]`);
    const normalizedValue = applyCaseTransform(rawValue, rule.style);
    pushNormalization(
      normalizations,
      `${rule.field}[${index}]`,
      rawValue,
      normalizedValue,
      rule.reason ?? `${rule.field} uses ${rule.style}`
    );

    return normalizedValue;
  });

  setNestedValue(spec, rule.field, normalizedItems);
}

function normalizeUpperField(rule, spec, normalizations) {
  const rawValue = ensureString(getNestedValue(spec, rule.field), rule.field);
  const normalizedValue = rawValue.toUpperCase();
  pushNormalization(
    normalizations,
    rule.field,
    rawValue,
    normalizedValue,
    rule.reason ?? `${rule.field} uses uppercase`
  );
  setNestedValue(spec, rule.field, normalizedValue);
}

function deriveMapperName(command, spec) {
  const mapperPrefix = getPolicyValue(command, "prefixes", "mapper", "map");
  const mapperJoiner = getPolicyValue(command, "joiners", "mapper", "To");
  return applyCaseTransform(
    `${mapperPrefix}${ensureString(spec.sourceType, "sourceType")}${mapperJoiner}${ensureString(spec.targetType, "targetType")}`,
    "camel"
  );
}

function deriveField(rule, command, spec, normalizations) {
  if (rule.kindName === "httpConstant") {
    const method = ensureString(spec.method, "method").toUpperCase();
    const resource = ensureString(spec.resource, "resource");
    const prefix = getPolicyValue(command, "prefixes", "endpointConstant", "");
    const suffix = getPolicyValue(command, "suffixes", "endpointConstant", "");
    const derivedValue = `${prefix}${applyCaseTransform(`${method}_${resource}`, "upperSnake")}${suffix}`;
    setNestedValue(spec, rule.field, derivedValue);
    return;
  }

  if (rule.kindName === "mapperName") {
    const currentValue = spec[rule.field];
    const derivedValue = currentValue
      ? applyCaseTransform(ensureString(currentValue, rule.field), "camel")
      : deriveMapperName(command, spec);

    if (currentValue) {
      pushNormalization(
        normalizations,
        rule.field,
        currentValue,
        derivedValue,
        rule.reason ?? `${rule.field} uses camelCase`
      );
    }

    setNestedValue(spec, rule.field, derivedValue);
    return;
  }

  throw createCliError("INVALID_RECIPE", `Unsupported derive rule: ${rule.kindName}`, {
    kindName: rule.kindName,
    command: command.name
  });
}

function applyNormalizationRule(rule, command, spec, normalizations) {
  if (rule.kind === "case") {
    return normalizeMainField(rule, spec, normalizations);
  }

  if (rule.kind === "path") {
    return normalizePathRule(rule, spec);
  }

  if (rule.kind === "prefixedName") {
    return normalizePrefixedName(rule, command, spec, normalizations);
  }

  if (rule.kind === "intentName") {
    return normalizeIntentName(rule, command, spec, normalizations);
  }

  if (rule.kind === "members") {
    return normalizeMembersRule(rule, command, spec, normalizations);
  }

  if (rule.kind === "listItemNames") {
    return normalizeListItemNames(rule, spec, normalizations);
  }

  if (rule.kind === "stringList") {
    return normalizeStringList(rule, spec, normalizations);
  }

  if (rule.kind === "uppercase") {
    return normalizeUpperField(rule, spec, normalizations);
  }

  if (rule.kind === "derive") {
    return deriveField(rule, command, spec, normalizations);
  }

  throw createCliError("INVALID_RECIPE", `Unsupported normalization rule: ${rule.kind}`, {
    kind: rule.kind,
    command: command.name
  });
}

function resolveTemplatePath(command, spec) {
  const render = command.render ?? {};
  if (render.snippetTemplatePath) {
    return render.snippetTemplatePath;
  }

  if (render.templatePath) {
    return render.templatePath;
  }

  if (!render.templatePaths) {
    throw createCliError("MISSING_TEMPLATE", `Missing template for ${command.name}`, {
      command: command.name
    });
  }

  const variantField = render.templateVariantField;
  const variantRawValue = variantField ? spec[variantField] : undefined;
  const variantKey = render.templateVariantMap?.[variantRawValue] ?? variantRawValue ?? render.defaultVariant;
  const templatePath = render.templatePaths[variantKey];

  if (!templatePath) {
    throw createCliError("MISSING_TEMPLATE", `Missing template variant: ${variantKey}`, {
      command: command.name,
      variantKey
    });
  }

  return templatePath;
}

export function normalizeSpec({
  command,
  spec
}) {
  const normalizations = [];
  const normalizedSpec = mergeDefaults(spec, command.defaults ?? {});

  validateInputSchema(command, normalizedSpec);

  for (const rule of command.normalizationRules ?? []) {
    applyNormalizationRule(rule, command, normalizedSpec, normalizations);
  }

  return {
    normalizedSpec,
    normalizations
  };
}

export async function renderSnippet({
  command,
  normalizedSpec
}) {
  const templatePath = resolveTemplatePath(command, normalizedSpec);
  const context = buildRenderContext(command, normalizedSpec);
  const code = await renderTemplateFile(templatePath, context);

  return {
    kind: "snippet",
    language: command.execution?.language ?? "text",
    code
  };
}
