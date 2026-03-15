import { renderTemplateFile } from "./template-engine.mjs";
import { toCamelCase, toPascalCase } from "./naming.mjs";
import { normalizeCliPath } from "./path-utils.mjs";

function createCliError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

function pushNormalization(normalizations, field, from, to, reason) {
  if (from !== to) {
    normalizations.push({
      field,
      from,
      to,
      reason
    });
  }
}

function ensureString(value, field, code = "INVALID_SPEC") {
  if (typeof value !== "string" || value.trim() === "") {
    throw createCliError(code, `Missing or invalid field: ${field}`, {
      field
    });
  }

  return value.trim();
}

function ensureObject(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw createCliError("INVALID_SPEC", `Field ${field} must be an object.`, {
      field
    });
  }

  return value;
}

function ensureArray(value, field) {
  if (!Array.isArray(value)) {
    throw createCliError("INVALID_SPEC", `Field ${field} must be an array.`, {
      field
    });
  }

  return value;
}

function ensureEnum(value, field, allowedValues) {
  const normalized = ensureString(value, field);
  if (!allowedValues.includes(normalized)) {
    throw createCliError(
      "INVALID_SPEC",
      `Field ${field} must be one of: ${allowedValues.join(", ")}.`,
      {
        field,
        allowedValues,
        value: normalized
      }
    );
  }

  return normalized;
}

function normalizePath(value) {
  return normalizeCliPath(ensureString(value, "path"));
}

function deriveHandlerNameFromAction(action) {
  return `handle${toPascalCase(action)}`;
}

function deriveCallbackNameFromAction(action) {
  return `on${toPascalCase(action)}`;
}

function normalizeInternalHandlerName(spec, normalizations) {
  const rawName = spec.name ? ensureString(spec.name, "name") : null;
  const rawAction = spec.action ? ensureString(spec.action, "action") : null;
  const fromAction = rawAction ? deriveHandlerNameFromAction(rawAction) : null;

  if (!rawName && !fromAction) {
    throw createCliError(
      "INVALID_SPEC",
      "Function spec requires name or action for internalHandler."
    );
  }

  if (rawName?.startsWith("handle")) {
    if (fromAction && rawName !== fromAction) {
      throw createCliError("SPEC_CONFLICT", "name and action conflict for internal handler.", {
        name: rawName,
        action: rawAction
      });
    }

    return rawName;
  }

  if (rawName?.startsWith("on")) {
    const normalized = `handle${rawName.slice(2)}`;
    if (fromAction && normalized !== fromAction) {
      throw createCliError("SPEC_CONFLICT", "name and action conflict for internal handler.", {
        name: rawName,
        action: rawAction
      });
    }

    pushNormalization(
      normalizations,
      "name",
      rawName,
      normalized,
      "internal handlers use handle*"
    );
    return normalized;
  }

  if (rawName) {
    const normalized = `handle${toPascalCase(rawName)}`;
    if (fromAction && normalized !== fromAction) {
      throw createCliError("SPEC_CONFLICT", "name and action conflict for internal handler.", {
        name: rawName,
        action: rawAction
      });
    }

    pushNormalization(
      normalizations,
      "name",
      rawName,
      normalized,
      "internal handlers use handle*"
    );
    return normalized;
  }

  return fromAction;
}

function normalizeUtilityName(spec, normalizations) {
  const rawName = ensureString(spec.name ?? spec.action, "name");
  const normalized = toCamelCase(rawName);
  pushNormalization(
    normalizations,
    "name",
    rawName,
    normalized,
    "utility functions use camelCase"
  );
  return normalized;
}

function normalizeHookName(rawName, normalizations) {
  const normalized = rawName.startsWith("use")
    ? `use${toPascalCase(rawName.slice(3))}`
    : `use${toPascalCase(rawName)}`;
  pushNormalization(normalizations, "name", rawName, normalized, "hooks use use*");
  return normalized;
}

function normalizeComponentName(rawName, normalizations) {
  const normalized = toPascalCase(rawName);
  pushNormalization(
    normalizations,
    "name",
    rawName,
    normalized,
    "components use PascalCase"
  );
  return normalized;
}

function normalizeTypeName(rawName, normalizations) {
  const normalized = toPascalCase(rawName);
  pushNormalization(normalizations, "name", rawName, normalized, "types use PascalCase");
  return normalized;
}

function normalizeCallbackMember(member, index, normalizations, field = "members") {
  const rawName = ensureString(member.name ?? member.action, `${field}[${index}].name`);
  let normalizedName;

  if (rawName.startsWith("on")) {
    normalizedName = `on${toPascalCase(rawName.slice(2))}`;
  } else if (rawName.startsWith("handle")) {
    normalizedName = `on${rawName.slice("handle".length)}`;
  } else {
    normalizedName = deriveCallbackNameFromAction(rawName);
  }

  pushNormalization(
    normalizations,
    `${field}[${index}].name`,
    rawName,
    normalizedName,
    "props callbacks use on*"
  );

  return {
    kind: "callback",
    name: normalizedName,
    params: Array.isArray(member.params) ? member.params : [],
    required: Boolean(member.required),
    returns: member.returns ?? "void"
  };
}

function normalizeValueMember(member, index, normalizations, field = "members") {
  const rawName = ensureString(member.name, `${field}[${index}].name`);
  const normalizedName = toCamelCase(rawName);
  pushNormalization(
    normalizations,
    `${field}[${index}].name`,
    rawName,
    normalizedName,
    "prop members use camelCase"
  );

  return {
    kind: "value",
    name: normalizedName,
    type: ensureString(member.type, `members[${index}].type`),
    required: Boolean(member.required)
  };
}

function normalizeMembersList(members, field, normalizations) {
  return ensureArray(members ?? [], field).map((member, index) => {
    ensureObject(member, `${field}[${index}]`);
    if (member.kind === "callback") {
      return normalizeCallbackMember(member, index, normalizations, field);
    }

    return normalizeValueMember(member, index, normalizations, field);
  });
}

function buildFunctionSignature(params = [], returns = "void") {
  const signature = params
    .map((param) => `${param.name}: ${param.type ?? "unknown"}`)
    .join(", ");

  return {
    signature,
    returns
  };
}

function renderMembersOnly(members) {
  return members
    .map((member) => {
      if (member.kind === "callback") {
        const signature = member.params
          .map((param) => `${param.name}: ${param.type ?? "unknown"}`)
          .join(", ");
        const optional = member.required ? "" : "?";
        return `${member.name}${optional}: (${signature}) => ${member.returns};`;
      }

      const optional = member.required ? "" : "?";
      return `${member.name}${optional}: ${member.type};`;
    })
    .join("\n");
}

function renderUiState(normalizedSpec) {
  const stateBase = toPascalCase(normalizedSpec.name);
  const stateName = `is${stateBase}Open`;
  const setterName = `setIs${stateBase}Open`;

  if (normalizedSpec.pattern === "toggle") {
    return [
      `const [${stateName}, ${setterName}] = useState(${String(normalizedSpec.initial)});`,
      "",
      `const handleToggle${stateBase} = () => {`,
      `  ${setterName}((prev) => !prev);`,
      "};"
    ].join("\n");
  }

  return [
    `const [${stateName}, ${setterName}] = useState(${String(normalizedSpec.initial)});`,
    "",
    `const handleOpen${stateBase} = () => {`,
    `  ${setterName}(true);`,
    "};",
    "",
    `const handleClose${stateBase} = () => {`,
    `  ${setterName}(false);`,
    "};"
  ].join("\n");
}

function renderQueryKey(normalizedSpec) {
  const functionName = `${toCamelCase(normalizedSpec.domain)}${toPascalCase(normalizedSpec.scope)}QueryKey`;
  const paramsSignature = normalizedSpec.params
    .map((param) => `${param}: string`)
    .join(", ");
  const members = [
    `"${normalizedSpec.domain}"`,
    `"${normalizedSpec.scope}"`,
    ...normalizedSpec.params
  ].join(", ");

  return `const ${functionName} = (${paramsSignature}) => [${members}] as const;`;
}

function renderEndpoint(normalizedSpec) {
  return `const ${normalizedSpec.constantName} = "${normalizedSpec.path}";`;
}

function renderMapper(normalizedSpec) {
  return [
    `const ${normalizedSpec.name} = (source: ${normalizedSpec.sourceType}): ${normalizedSpec.targetType} => {`,
    "  return {",
    "  };",
    "};"
  ].join("\n");
}

function renderHookReturn(normalizedSpec) {
  const names = [
    ...normalizedSpec.values.map((value) => value.name),
    ...normalizedSpec.actions.map((action) => action.name)
  ];
  return ["return {", ...names.map((name) => `  ${name},`), "};"].join("\n");
}

function renderFunction(normalizedSpec) {
  const { signature, returns } = buildFunctionSignature(
    normalizedSpec.params,
    normalizedSpec.returns
  );
  const asyncToken = normalizedSpec.async ? "async " : "";
  const returnType = returns ? `: ${returns}` : "";

  return `const ${normalizedSpec.name} = ${asyncToken}(${signature})${returnType} => {\n};`;
}

function normalizeSpecByCommand(role, commandName, spec, normalizations) {
  switch (commandName) {
    case "component":
      return {
        ...spec,
        name: normalizeComponentName(ensureString(spec.name, "name"), normalizations),
        path: normalizePath(spec.path),
        role: spec.role ?? "component",
        props: normalizeMembersList(spec.props ?? [], "props", normalizations)
      };
    case "type":
      return {
        ...spec,
        name: normalizeTypeName(ensureString(spec.name, "name"), normalizations),
        kind: spec.kind
          ? ensureEnum(spec.kind, "kind", ["interface", "type"])
          : "interface"
      };
    case "hook":
      return {
        ...spec,
        name: normalizeHookName(ensureString(spec.name, "name"), normalizations),
        path: normalizePath(spec.path)
      };
    case "apiHook":
      return {
        ...spec,
        name: normalizeHookName(ensureString(spec.name, "name"), normalizations),
        path: normalizePath(spec.path),
        kind: ensureEnum(spec.kind, "kind", ["query", "mutation"])
      };
    case "function":
      return {
        ...spec,
        kind: spec.kind ?? "utility",
        name:
          (spec.kind ?? "utility") === "internalHandler"
            ? normalizeInternalHandlerName(spec, normalizations)
            : normalizeUtilityName(spec, normalizations),
        params: Array.isArray(spec.params) ? spec.params : [],
        returns: spec.returns ?? "void",
        async: Boolean(spec.async)
      };
    case "props":
      return {
        ...spec,
        members: normalizeMembersList(spec.members ?? [], "members", normalizations)
      };
    case "uiState":
      return {
        ...spec,
        category: ensureString(spec.category ?? "uiInteraction", "category"),
        pattern: ensureString(spec.pattern ?? "toggle", "pattern"),
        name: toCamelCase(ensureString(spec.name, "name")),
        initial: spec.initial ?? false
      };
    case "queryKey":
      return {
        ...spec,
        domain: toCamelCase(ensureString(spec.domain, "domain")),
        scope: toCamelCase(ensureString(spec.scope ?? "detail", "scope")),
        params: Array.isArray(spec.params) ? spec.params : []
      };
    case "endpoint": {
      const method = ensureString(spec.method, "method").toUpperCase();
      const resource = ensureString(spec.resource, "resource");
      return {
        ...spec,
        method,
        resource,
        path: ensureString(spec.path, "path"),
        constantName: `${method}_${resource.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[-/]+/g, "_").toUpperCase()}`
      };
    }
    case "mapper":
      return {
        ...spec,
        name:
          spec.name
            ? toCamelCase(ensureString(spec.name, "name"))
            : `map${toPascalCase(ensureString(spec.sourceType, "sourceType"))}To${toPascalCase(
                ensureString(spec.targetType, "targetType")
              )}`,
        sourceType: ensureString(spec.sourceType, "sourceType"),
        targetType: ensureString(spec.targetType, "targetType")
      };
    case "hookReturn":
      return {
        ...spec,
        values: Array.isArray(spec.values) ? spec.values : [],
        actions: Array.isArray(spec.actions) ? spec.actions : []
      };
    case "module":
    case "requestDto":
    case "responseDto":
    case "entity":
      return {
        ...spec,
        name: normalizeTypeName(ensureString(spec.name, "name"), normalizations),
        path: normalizePath(spec.path),
        basePackage: typeof spec.basePackage === "string" ? spec.basePackage.trim() : spec.basePackage,
        fields: Array.isArray(spec.fields) ? spec.fields : []
      };
    default:
      throw createCliError("UNKNOWN_COMMAND", `Unknown command: ${commandName}`, {
        command: commandName,
        role
      });
  }
}

export function normalizeSpec({ role, commandName, spec }) {
  const normalizations = [];
  const normalizedSpec = normalizeSpecByCommand(role, commandName, spec, normalizations);

  return {
    normalizedSpec,
    normalizations
  };
}

export async function renderSnippet({
  command,
  commandName,
  normalizedSpec
}) {
  switch (commandName) {
    case "type": {
      const templatePath = command.templatePaths?.[normalizedSpec.kind];
      const code = await renderTemplateFile(templatePath, {
        typeName: normalizedSpec.name
      });
      return {
        kind: "snippet",
        language: "ts",
        code
      };
    }
    case "props":
      return {
        kind: "snippet",
        language: "ts",
        code: renderMembersOnly(normalizedSpec.members)
      };
    case "function":
      return {
        kind: "snippet",
        language: "ts",
        code: renderFunction(normalizedSpec)
      };
    case "uiState":
      return {
        kind: "snippet",
        language: "ts",
        code: renderUiState(normalizedSpec)
      };
    case "queryKey":
      return {
        kind: "snippet",
        language: "ts",
        code: renderQueryKey(normalizedSpec)
      };
    case "endpoint":
      return {
        kind: "snippet",
        language: "ts",
        code: renderEndpoint(normalizedSpec)
      };
    case "mapper":
      return {
        kind: "snippet",
        language: "ts",
        code: renderMapper(normalizedSpec)
      };
    case "hookReturn":
      return {
        kind: "snippet",
        language: "ts",
        code: renderHookReturn(normalizedSpec)
      };
    default:
      throw createCliError(
        "UNSUPPORTED_SNIPPET_COMMAND",
        `Unsupported snippet command: ${commandName}`,
        {
          command: commandName
        }
      );
  }
}
