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

function assertPathRoots(pathValue, allowedRoots) {
  const segments = validateRelativePath(
    pathValue,
    "INVALID_PATH",
    "Path must be a relative repo path"
  );

  if (allowedRoots?.length && !allowedRoots.includes(segments[0])) {
    throw createCliError("INVALID_PATH_ROOT", "Path root is not allowed", {
      path: pathValue,
      allowedRoots
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

function assertApiHookPath(pathValue, kind, rule) {
  const normalized = normalizeCliPath(pathValue);
  const suffix = rule.suffixMap?.[kind] ?? "queries";

  if (!normalized.includes(rule.requiredSegment ?? "/apis/") && !normalized.startsWith(rule.apiRoot ?? "hooks/apis")) {
    throw createCliError("INVALID_API_PATH", "API hook path must include hooks/apis", {
      path: pathValue
    });
  }

  if (!normalized.endsWith(`/${suffix}`)) {
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
      assertPathRoots(args[rule.field], rule.allowedRoots);
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

  if (rule.kind === "apiHookPath") {
    if (args[rule.field]) {
      assertApiHookPath(args[rule.field], args[rule.kindField], rule);
      checks.push(`${rule.field}.apiHookPath=ok`);
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

export async function validateRequest({
  profile,
  commandName,
  args,
  files,
  repoRoot
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
      checks: []
    };
  }

  const checks = [];
  for (const rule of command.validatorRules ?? []) {
    await applyValidatorRule(rule, command, args, files, repoRoot, checks);
  }

  return {
    ok: true,
    checks
  };
}
