import {
  isCamelCaseSegment,
  isLowerCasePackageSegment,
  isRelativeCliPath,
  normalizeCliPath,
  splitCliPath
} from "./path-utils.mjs";
import { createCliError, getPolicyValue } from "./recipe-utils.mjs";
import { detectSpringBasePackage } from "../validators/backend-utils.mjs";

function validateRelativePath(pathValue, code, message) {
  const normalized = normalizeCliPath(pathValue);
  if (!isRelativeCliPath(normalized)) {
    throw createCliError(code, message, {
      path: pathValue
    });
  }

  const segments = splitCliPath(normalized);
  if (!segments.length) {
    throw createCliError(code, message, {
      path: pathValue
    });
  }

  return segments;
}

function findPathRootMatchIndex(segments, allowedRoots, matchAnySegment = false) {
  if (!allowedRoots?.length) {
    return 0;
  }

  if (!matchAnySegment) {
    return allowedRoots.includes(segments[0]) ? 0 : -1;
  }

  return segments.findIndex((segment) => allowedRoots.includes(segment));
}

function assertPathRoots(pathValue, allowedRoots, options = {}) {
  const segments = validateRelativePath(
    pathValue,
    "INVALID_PATH",
    "Path must be a relative repo path"
  );

  const matchedIndex = findPathRootMatchIndex(
    segments,
    allowedRoots,
    options.matchAnySegment === true
  );

  if (matchedIndex === -1) {
    throw createCliError("INVALID_PATH_ROOT", "Path root is not allowed", {
      path: pathValue,
      allowedRoots,
      matchAnySegment: options.matchAnySegment === true
    });
  }
}

function assertPathSegmentCase(pathValue, style, code, message) {
  const segments = validateRelativePath(pathValue, code, message);
  const predicate = style === "lower"
    ? isLowerCasePackageSegment
    : isCamelCaseSegment;

  for (const segment of segments) {
    if (!predicate(segment)) {
      throw createCliError(code, message, {
        path: pathValue,
        segment
      });
    }
  }
}

function assertNameCase(name, style, code, message) {
  const patterns = {
    pascal: /^[A-Z][A-Za-z0-9]*$/,
    camel: /^[a-z][A-Za-z0-9]*$/,
    upperSnake: /^[A-Z][A-Z0-9_]*$/
  };
  const pattern = patterns[style];

  if (!pattern?.test(name)) {
    throw createCliError(code, message, {
      name,
      style
    });
  }
}

function assertNamePrefix(name, prefix, code, message) {
  if (!name.startsWith(prefix)) {
    throw createCliError(code, message, {
      name,
      prefix
    });
  }
}

function assertHookPathPolicy(pathValue, rule) {
  const segments = validateRelativePath(
    pathValue,
    "INVALID_HOOK_PATH",
    "Hook path must be a relative repo path"
  );
  const expectedBaseSegments = rule.baseSegments ?? ["hooks", "utils"];
  const [root, bucket, domain, ...rest] = segments;

  if (
    root !== expectedBaseSegments[0] ||
    bucket !== expectedBaseSegments[1] ||
    !domain ||
    rest.length > 0
  ) {
    throw createCliError(
      "INVALID_HOOK_PATH",
      "Custom hook path must be hooks/utils/{domain} or hooks/utils/common",
      {
        path: pathValue,
        expectedBaseSegments,
        sharedSegment: rule.sharedSegment ?? "common"
      }
    );
  }
}

function assertPublisherComponentPath(pathValue, rule) {
  const segments = validateRelativePath(
    pathValue,
    "INVALID_COMPONENT_PATH",
    "Component path must be a relative repo path"
  );
  const componentsRoot = rule.componentsRoot ?? "components";
  const sharedSegment = rule.sharedSegment ?? "common";
  const componentsIndex = segments.lastIndexOf(componentsRoot);
  const [root, scope, componentSegment, ...rest] = componentsIndex === -1
    ? []
    : segments.slice(componentsIndex);

  if (
    componentsIndex === -1 ||
    root !== componentsRoot ||
    !scope ||
    !componentSegment ||
    rest.length > 0
  ) {
    throw createCliError(
      "INVALID_COMPONENT_PATH",
      "Publisher component path must live under a components segment using */components/common/{component} or */components/{domain}/{component}",
      {
        path: pathValue,
        componentsRoot,
        sharedSegment
      }
    );
  }

  if (scope === sharedSegment) {
    return;
  }
}

function assertApiHookPath(pathValue, kind, rule) {
  const suffix = rule.suffixMap?.[kind] ?? "queries";
  const segments = validateRelativePath(
    pathValue,
    "INVALID_API_PATH",
    "API hook path must be a relative repo path"
  );
  const [root, apisSegment, domain, pathSuffix, ...rest] = segments;

  if (
    root !== "hooks" ||
    apisSegment !== "apis" ||
    !domain ||
    !pathSuffix ||
    rest.length > 0
  ) {
    throw createCliError(
      "INVALID_API_PATH",
      "API hook path must be hooks/apis/{domain}/queries or hooks/apis/{domain}/mutations",
      {
        path: pathValue
      }
    );
  }

  if (pathSuffix !== suffix) {
    throw createCliError(
      "INVALID_API_PATH",
      `API hook path must end with ${suffix}`,
      {
        path: pathValue,
        kind
      }
    );
  }
}

function assertApiHookMethodPolicy(kind, method, rule) {
  if (kind === "query") {
    if (method !== rule.queryMethod) {
      throw createCliError(
        "INVALID_API_METHOD",
        `Query API hooks must use ${rule.queryMethod}`,
        {
          kind,
          method
        }
      );
    }
    return;
  }

  if (kind === "mutation") {
    if (!(rule.mutationMethods ?? []).includes(method)) {
      throw createCliError(
        "INVALID_API_METHOD",
        "Mutation API hooks must use POST, PUT, PATCH, or DELETE",
        {
          kind,
          method,
          allowedMethods: rule.mutationMethods ?? []
        }
      );
    }
    return;
  }

  throw createCliError("INVALID_API_METHOD", "Unsupported API hook kind", {
    kind
  });
}

function assertApiHookNamePolicy(name, kind, method, rule) {
  for (const forbiddenPrefix of rule.forbiddenPrefixes ?? []) {
    if (name.startsWith(forbiddenPrefix)) {
      throw createCliError(
        "INVALID_HOOK_NAME",
        `API hook name must not start with ${forbiddenPrefix}`,
        {
          name,
          forbiddenPrefix
        }
      );
    }
  }

  const expectedPrefix = kind === "query"
    ? rule.queryPrefix
    : rule.mutationPrefixMap?.[method];

  if (!expectedPrefix) {
    throw createCliError("INVALID_HOOK_NAME", "Unsupported API hook naming policy", {
      name,
      kind,
      method
    });
  }

  const pattern = new RegExp(`^${expectedPrefix}[A-Z][A-Za-z0-9]*$`);
  if (!pattern.test(name)) {
    throw createCliError(
      "INVALID_HOOK_NAME",
      `API hook name must match ${expectedPrefix}*`,
      {
        name,
        kind,
        method,
        expectedPrefix
      }
    );
  }
}

function assertForbiddenPatterns(files, patterns) {
  for (const file of files ?? []) {
    for (const pattern of patterns) {
      if (file.content.includes(pattern)) {
        throw createCliError("FORBIDDEN_PATTERN", `Forbidden pattern found: ${pattern}`, {
          path: file.path,
          pattern
        });
      }
    }
  }
}

async function applyValidatorRule(rule, command, args, files, repoRoot, checks) {
  if (rule.kind === "pathRoots") {
    if (args[rule.field]) {
      assertPathRoots(args[rule.field], rule.allowedRoots, rule);
      checks.push(`${rule.field}.roots=ok`);
    }
    return;
  }

  if (rule.kind === "pathSegmentCase") {
    if (args[rule.field]) {
      assertPathSegmentCase(
        args[rule.field],
        rule.style,
        rule.code ?? "INVALID_PATH_SEGMENT",
        rule.message ?? `Path segments must use ${rule.style}`
      );
      checks.push(`${rule.field}.segmentCase=${rule.style}`);
    }
    return;
  }

  if (rule.kind === "hookPathPolicy") {
    if (args[rule.field]) {
      assertHookPathPolicy(args[rule.field], rule);
      checks.push(`${rule.field}.hookPathPolicy=ok`);
    }
    return;
  }

  if (rule.kind === "publisherComponentPathPolicy") {
    if (args[rule.field]) {
      assertPublisherComponentPath(args[rule.field], rule);
      checks.push(`${rule.field}.publisherComponentPathPolicy=ok`);
    }
    return;
  }

  if (rule.kind === "nameCase") {
    if (args[rule.field]) {
      assertNameCase(
        args[rule.field],
        rule.style,
        rule.code ?? "INVALID_NAME",
        rule.message ?? `${rule.field} must use ${rule.style}`
      );
      checks.push(`${rule.field}.case=${rule.style}`);
    }
    return;
  }

  if (rule.kind === "namePrefix") {
    if (args[rule.field]) {
      const prefix = rule.prefixKey
        ? getPolicyValue(command, "prefixes", rule.prefixKey, "")
        : rule.prefix;
      assertNamePrefix(
        args[rule.field],
        prefix,
        rule.code ?? "INVALID_NAME",
        rule.message ?? `${rule.field} must start with ${prefix}`
      );
      checks.push(`${rule.field}.prefix=${prefix}`);
    }
    return;
  }

  if (rule.kind === "apiHookMethodPolicy") {
    assertApiHookMethodPolicy(args[rule.kindField], args[rule.methodField], rule);
    checks.push(`${rule.methodField}.apiHookMethodPolicy=ok`);
    return;
  }

  if (rule.kind === "apiHookPath") {
    if (args[rule.field]) {
      assertApiHookPath(args[rule.field], args[rule.kindField], rule);
      checks.push(`${rule.field}.apiHookPath=ok`);
    }
    return;
  }

  if (rule.kind === "apiHookNamePolicy") {
    if (args[rule.field]) {
      assertApiHookNamePolicy(
        args[rule.field],
        args[rule.kindField],
        args[rule.methodField],
        rule
      );
      checks.push(`${rule.field}.apiHookNamePolicy=ok`);
    }
    return;
  }

  if (rule.kind === "forbiddenContentPatterns") {
    assertForbiddenPatterns(files, rule.patterns ?? []);
    checks.push("forbiddenPatterns=clear");
    return;
  }

  if (rule.kind === "springBasePackage") {
    if (!args[rule.field]) {
      const detectedBasePackage = await detectSpringBasePackage(repoRoot);
      if (!detectedBasePackage) {
        throw createCliError(
          "ROOT_PACKAGE_NOT_FOUND",
          "Spring root package could not be detected. Provide basePackage in the JSON spec.",
          {
            command: command.name
          }
        );
      }
    }
    checks.push(`${rule.field}.detectable=true`);
    return;
  }

  throw createCliError("INVALID_RECIPE", `Unsupported validator rule: ${rule.kind}`, {
    kind: rule.kind,
    command: command.name
  });
}

function toValidationViolation(error) {
  return {
    code: error?.code ?? "UNHANDLED_VALIDATION_ERROR",
    severity: "error",
    message: error instanceof Error ? error.message : String(error),
    details: error?.details ?? {}
  };
}

export async function validateRequest({
  profile,
  commandName,
  args,
  files,
  repoRoot,
  collectViolations = false
}) {
  const baseCommand = profile.commands?.[commandName];
  const command = baseCommand
    ? {
        name: commandName,
        ...baseCommand
      }
    : null;
  if (!command) {
    return {
      ok: true,
      checks: [],
      violations: []
    };
  }

  const checks = [];
  const violations = [];
  for (const rule of command.validatorRules ?? []) {
    try {
      await applyValidatorRule(rule, command, args, files, repoRoot, checks);
    } catch (error) {
      if (!collectViolations) {
        throw error;
      }

      violations.push(toValidationViolation(error));
    }
  }

  return {
    ok: violations.length === 0,
    checks,
    violations
  };
}
