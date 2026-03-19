import { toPascalCase } from "../shared/naming.mjs";
import {
  applyCaseTransform,
  createCliError,
  getPolicyValue
} from "../shared/recipe-utils.mjs";

function formatMembersBlock(members = [], indent = "  ") {
  if (!Array.isArray(members) || members.length === 0) {
    return "";
  }

  return members
    .map((member) => {
      if (member.kind === "callback") {
        const signature = (member.params ?? [])
          .map((param) => `${param.name}: ${param.type ?? "unknown"}`)
          .join(", ");
        const optional = member.required ? "" : "?";
        return `${indent}${member.name}${optional}: (${signature}) => ${member.returns ?? "void"};`;
      }

      const optional = member.required ? "" : "?";
      return `${indent}${member.name}${optional}: ${member.type};`;
    })
    .join("\n");
}

function formatHookReturnMembers(spec) {
  const names = [
    ...(spec.values ?? []).map((value) => value.name),
    ...(spec.actions ?? []).map((action) => action.name)
  ];

  return names.map((name) => `  ${name},`).join("\n");
}

function formatRecordFields(fields = []) {
  if (!Array.isArray(fields) || fields.length === 0) {
    return "  String value";
  }

  return fields
    .map((field) => {
      const validations = (field.validations ?? [])
        .map((validation) => `@${validation}`)
        .join(" ");
      const prefix = validations ? `${validations} ` : "";
      return `  ${prefix}${field.type} ${field.name}`;
    })
    .join(",\n");
}

function formatEntityFields(fields = []) {
  if (!Array.isArray(fields) || fields.length === 0) {
    return "  private String name;";
  }

  return fields
    .map((field) => `  private ${field.type} ${field.name};`)
    .join("\n");
}

function buildFunctionSignature(params = [], returns = "void") {
  const signature = params
    .map((param) => `${param.name}: ${param.type ?? "unknown"}`)
    .join(", ");

  return {
    signature,
    returnType: returns ? `: ${returns}` : ""
  };
}

function buildUiStateTokens(command, spec) {
  const stateBase = toPascalCase(spec.name);
  const stateSuffix = getPolicyValue(command, "suffixes", "uiState", "Open");
  const stateName = `${getPolicyValue(command, "prefixes", "uiStateBoolean", "is")}${stateBase}${stateSuffix}`;
  const setterName = `${getPolicyValue(command, "prefixes", "uiStateSetter", "setIs")}${stateBase}${stateSuffix}`;

  return {
    uiStateBaseName: stateBase,
    uiStateName: stateName,
    uiStateSetterName: setterName,
    uiStateToggleHandlerName: `${getPolicyValue(command, "prefixes", "uiStateToggleHandler", "handleToggle")}${stateBase}`,
    uiStateOpenHandlerName: `${getPolicyValue(command, "prefixes", "uiStateOpenHandler", "handleOpen")}${stateBase}`,
    uiStateCloseHandlerName: `${getPolicyValue(command, "prefixes", "uiStateCloseHandler", "handleClose")}${stateBase}`
  };
}

function buildQueryKeyTokens(command, spec) {
  const suffix = getPolicyValue(command, "suffixes", "queryKeyFunction", "QueryKey");
  const functionName = `${applyCaseTransform(spec.domain, "camel")}${applyCaseTransform(spec.scope, "pascal")}${suffix}`;
  const paramsSignature = (spec.params ?? [])
    .map((param) => `${param}: string`)
    .join(", ");
  const members = [
    `"${spec.domain}"`,
    `"${spec.scope}"`,
    ...(spec.params ?? [])
  ].join(", ");

  return {
    queryKeyFunctionName: functionName,
    queryKeyParamsSignature: paramsSignature,
    queryKeyMembers: members
  };
}

function resolveDomainName(spec) {
  const segments = spec.path?.split("/").filter(Boolean) ?? [];
  const apisIndex = segments.indexOf("apis");
  if (apisIndex >= 0 && segments[apisIndex + 1]) {
    return segments[apisIndex + 1];
  }

  return segments.slice(-1)[0] ?? spec.path ?? "";
}

function buildEndpointTokens(command, spec) {
  if (spec.constantName) {
    return {
      endpointConstantName: spec.constantName
    };
  }

  const prefix = getPolicyValue(command, "prefixes", "endpointConstant", "");
  const suffix = getPolicyValue(command, "suffixes", "endpointConstant", "");
  const base = `${spec.method}_${spec.resource}`;

  return {
    endpointConstantName: `${prefix}${applyCaseTransform(base, "upperSnake")}${suffix}`
  };
}

function buildMapperTokens(command, spec) {
  const mapperPrefix = getPolicyValue(command, "prefixes", "mapper", "map");
  const mapperJoiner = getPolicyValue(command, "joiners", "mapper", "To");
  const derivedName = `${mapperPrefix}${toPascalCase(spec.sourceType)}${mapperJoiner}${toPascalCase(spec.targetType)}`;

  return {
    mapperName: spec.name ?? applyCaseTransform(derivedName, "camel")
  };
}

function resolveToken(command, spec, tokenName) {
  const functionSignature = buildFunctionSignature(spec.params, spec.returns);

  const resolvers = {
    name: () => spec.name,
    componentName: () => spec.name,
    hookName: () => spec.name,
    className: () => spec.name,
    functionName: () => spec.name,
    typeName: () => spec.name,
    interfaceName: () => `${spec.name}${getPolicyValue(command, "suffixes", "interfaceName", "Props")}`,
    propsMembers: () => formatMembersBlock(spec.props, "  "),
    membersOnly: () => formatMembersBlock(spec.members, ""),
    functionSignature: () => functionSignature.signature,
    functionReturnType: () => functionSignature.returnType,
    asyncToken: () => (spec.async ? "async " : ""),
    hookReturnMembers: () => formatHookReturnMembers(spec),
    recordFields: () => formatRecordFields(spec.fields),
    entityFields: () => formatEntityFields(spec.fields),
    basePackagePath: () => (spec.basePackage ? spec.basePackage.replaceAll(".", "/") : ""),
    basePackage: () => spec.basePackage ?? "",
    packagePath: () => spec.path ?? "",
    packagePathDot: () => (spec.path ? spec.path.replaceAll("/", ".") : ""),
    featurePath: () => spec.path ?? "",
    featurePackage: () => (spec.basePackage && spec.path
      ? `${spec.basePackage}.${spec.path.replaceAll("/", ".")}`
      : ""),
    domainName: () => resolveDomainName(spec),
    queryKind: () => spec.kind ?? "",
    sourceType: () => spec.sourceType ?? "",
    targetType: () => spec.targetType ?? "",
    path: () => spec.path ?? "",
    initial: () => String(spec.initial ?? false)
  };

  if (tokenName in resolvers) {
    return resolvers[tokenName]();
  }

  if (tokenName.startsWith("uiState")) {
    return buildUiStateTokens(command, spec)[tokenName];
  }

  if (tokenName.startsWith("queryKey")) {
    return buildQueryKeyTokens(command, spec)[tokenName];
  }

  if (tokenName === "endpointConstantName") {
    return buildEndpointTokens(command, spec)[tokenName];
  }

  if (tokenName === "mapperName") {
    return buildMapperTokens(command, spec)[tokenName];
  }

  if (tokenName in spec) {
    return spec[tokenName];
  }

  throw createCliError("INVALID_RECIPE", `Unsupported context token: ${tokenName}`, {
    token: tokenName,
    command: command.name
  });
}

export function buildRenderContext(command, normalizedSpec) {
  const context = {
    ...normalizedSpec
  };

  for (const tokenName of command.render?.contextTokens ?? []) {
    context[tokenName] = resolveToken(command, normalizedSpec, tokenName);
  }

  return context;
}
