import {
  isCamelCaseSegment,
  isLowerCasePackageSegment,
  isRelativeCliPath,
  normalizeCliPath,
  splitCliPath
} from "./path-utils.mjs";
import { applyFieldResolvers, resolveCommandArgs } from "./command-args-resolver.mjs";
import { createCliError, getNestedValue, getPolicyValue } from "./recipe-utils.mjs";
import { matchCliPathPatterns } from "./path-patterns.mjs";

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

  return {
    normalized,
    segments
  };
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
  const { segments } = validateRelativePath(
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
  const { segments } = validateRelativePath(pathValue, code, message);
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

function assertPathPatterns(pathValue, rule) {
  const { normalized } = validateRelativePath(
    pathValue,
    rule.code ?? "INVALID_PATH",
    rule.message ?? "Path must be a relative repo path"
  );
  const matched = matchCliPathPatterns(rule.patterns ?? [], normalized);

  if (!matched) {
    throw createCliError(
      rule.code ?? "INVALID_PATH",
      rule.message ?? "Path does not match any required pattern.",
      {
        path: normalized,
        patterns: rule.patterns ?? []
      }
    );
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

function getSelectorKey(rule, args) {
  const selectorFields = Array.isArray(rule.selectorFields) ? rule.selectorFields : [];
  if (selectorFields.length === 0) {
    return null;
  }

  return selectorFields
    .map((field) => getNestedValue(args, field))
    .join(":");
}

function resolveCaseValue(rule, args) {
  if (!rule.cases) {
    return rule.defaultValue;
  }

  const selectorKey = getSelectorKey(rule, args);
  if (selectorKey && selectorKey in rule.cases) {
    return rule.cases[selectorKey];
  }

  return rule.defaultValue;
}

function assertFieldPattern(value, rule, args) {
  const patternSource = resolveCaseValue(rule, args) ?? rule.pattern;

  if (!patternSource) {
    throw createCliError(
      rule.code ?? "INVALID_FIELD_PATTERN",
      rule.unsupportedMessage ?? "No pattern was configured for this input.",
      {
        field: rule.field
      }
    );
  }

  const pattern = new RegExp(patternSource);
  if (!pattern.test(String(value))) {
    throw createCliError(
      rule.code ?? "INVALID_FIELD_PATTERN",
      rule.message ?? `${rule.field} does not match the required pattern.`,
      {
        field: rule.field,
        value,
        pattern: patternSource
      }
    );
  }
}

function assertConditionalAllowedValues(value, rule, args) {
  const allowedValues = resolveCaseValue(rule, args) ?? rule.allowedValues ?? [];

  if (!Array.isArray(allowedValues) || allowedValues.length === 0) {
    throw createCliError(
      rule.code ?? "INVALID_ALLOWED_VALUES",
      rule.unsupportedMessage ?? "No allowed values were configured for this input.",
      {
        field: rule.field
      }
    );
  }

  if (!allowedValues.includes(value)) {
    throw createCliError(
      rule.code ?? "INVALID_ALLOWED_VALUES",
      rule.message ?? `${rule.field} has an unsupported value.`,
      {
        field: rule.field,
        value,
        allowedValues
      }
    );
  }
}

function assertForbiddenPrefixes(value, rule) {
  for (const forbiddenPrefix of rule.prefixes ?? []) {
    if (String(value).startsWith(forbiddenPrefix)) {
      throw createCliError(
        rule.code ?? "INVALID_NAME",
        rule.message ?? `${rule.field} must not start with ${forbiddenPrefix}`,
        {
          field: rule.field,
          value,
          forbiddenPrefix
        }
      );
    }
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

async function applyValidatorRule(rule, command, args, files, projectRoot, checks) {
  const fieldValue = rule.field ? getNestedValue(args, rule.field) : undefined;

  if (rule.kind === "pathRoots") {
    if (fieldValue) {
      assertPathRoots(fieldValue, rule.allowedRoots, rule);
      checks.push(`${rule.field}.roots=ok`);
    }
    return;
  }

  if (rule.kind === "pathSegmentCase") {
    if (fieldValue) {
      assertPathSegmentCase(
        fieldValue,
        rule.style,
        rule.code ?? "INVALID_PATH_SEGMENT",
        rule.message ?? `Path segments must use ${rule.style}`
      );
      checks.push(`${rule.field}.segmentCase=${rule.style}`);
    }
    return;
  }

  if (rule.kind === "pathPatterns") {
    if (fieldValue) {
      assertPathPatterns(fieldValue, rule);
      checks.push(`${rule.field}.pathPatterns=ok`);
    }
    return;
  }

  if (rule.kind === "nameCase") {
    if (fieldValue) {
      assertNameCase(
        fieldValue,
        rule.style,
        rule.code ?? "INVALID_NAME",
        rule.message ?? `${rule.field} must use ${rule.style}`
      );
      checks.push(`${rule.field}.case=${rule.style}`);
    }
    return;
  }

  if (rule.kind === "namePrefix") {
    if (fieldValue) {
      const prefix = rule.prefixKey
        ? getPolicyValue(command, "prefixes", rule.prefixKey, "")
        : rule.prefix;
      assertNamePrefix(
        fieldValue,
        prefix,
        rule.code ?? "INVALID_NAME",
        rule.message ?? `${rule.field} must start with ${prefix}`
      );
      checks.push(`${rule.field}.prefix=${prefix}`);
    }
    return;
  }

  if (rule.kind === "fieldPattern") {
    if (fieldValue !== undefined) {
      assertFieldPattern(fieldValue, rule, args);
      checks.push(`${rule.field}.pattern=ok`);
    }
    return;
  }

  if (rule.kind === "conditionalAllowedValues") {
    if (fieldValue !== undefined) {
      assertConditionalAllowedValues(fieldValue, rule, args);
      checks.push(`${rule.field}.allowed=ok`);
    }
    return;
  }

  if (rule.kind === "forbiddenPrefixes") {
    if (fieldValue !== undefined) {
      assertForbiddenPrefixes(fieldValue, rule);
      checks.push(`${rule.field}.forbiddenPrefixes=clear`);
    }
    return;
  }

  if (rule.kind === "forbiddenContentPatterns") {
    assertForbiddenPatterns(files, rule.patterns ?? []);
    checks.push("forbiddenPatterns=clear");
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
  projectRoot,
  collectViolations = false,
  resolverContext = {}
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
      violations: [],
      resolvedArgs: args ?? {}
    };
  }

  const { args: resolvedArgs } = await resolveCommandArgs({
    command,
    args,
    projectRoot,
    context: resolverContext
  });

  const checks = [];
  const violations = [];
  for (const rule of command.validatorRules ?? []) {
    try {
      await applyValidatorRule(rule, command, resolvedArgs, files, projectRoot, checks);
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
    violations,
    resolvedArgs
  };
}

export { applyFieldResolvers };
