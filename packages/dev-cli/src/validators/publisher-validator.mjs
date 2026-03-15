import {
  isCamelCaseSegment,
  isRelativeCliPath,
  normalizeCliPath,
  splitCliPath
} from "../core/path-utils.mjs";

function createValidationError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

function assertCamelCasePath(filePath, allowedRoots) {
  const normalized = normalizeCliPath(filePath);
  if (!isRelativeCliPath(normalized)) {
    throw createValidationError("INVALID_PATH", "Path must be a relative repo path", {
      path: filePath
    });
  }

  const segments = splitCliPath(normalized);
  if (!segments.length) {
    throw createValidationError("INVALID_PATH", "Path cannot be empty", {
      path: filePath
    });
  }

  if (allowedRoots?.length && !allowedRoots.includes(segments[0])) {
    throw createValidationError("INVALID_PATH_ROOT", "Path root is not allowed", {
      path: filePath,
      allowedRoots
    });
  }

  for (const segment of segments) {
    if (!isCamelCaseSegment(segment)) {
      throw createValidationError(
        "INVALID_PATH_SEGMENT",
        "Path segments must use camelCase",
        {
          path: filePath,
          segment
        }
      );
    }
  }
}

function assertPascalCase(name, label) {
  if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) {
    throw createValidationError("INVALID_NAME", `${label} must use PascalCase`, {
      name
    });
  }
}

function assertForbiddenPatterns(files, patterns) {
  for (const file of files) {
    for (const pattern of patterns) {
      if (file.content.includes(pattern)) {
        throw createValidationError(
          "FORBIDDEN_PATTERN",
          `Forbidden pattern found: ${pattern}`,
          {
            path: file.path,
            pattern
          }
        );
      }
    }
  }
}

export async function validatePublisherRequest({
  profile,
  commandName,
  args,
  files
}) {
  const command = profile.commands?.[commandName] ?? profile.commands?.component;
  const checks = [];

  if (commandName === "component") {
    if (args.name) {
      assertPascalCase(args.name, "Component name");
      checks.push("component.name=PascalCase");
    }

    if (args.path) {
      assertCamelCasePath(
        args.path,
        command?.rules?.enforced?.pathPolicy?.allowedRoots
      );
      checks.push("path.segmentCase=camelCase");
    }
  }

  if (commandName === "type") {
    if (args.name) {
      assertPascalCase(args.name, "Type name");
      checks.push("type.name=PascalCase");
    }

    if (args.path) {
      assertCamelCasePath(
        args.path,
        command?.rules?.enforced?.pathPolicy?.allowedRoots
      );
      checks.push("type.path.segmentCase=camelCase");
    }
  }

  const forbiddenPatterns =
    command?.rules?.enforced?.logicBoundary?.forbiddenPatterns ??
    profile.commands?.component?.rules?.enforced?.logicBoundary?.forbiddenPatterns ??
    [];

  if (files?.length) {
    assertForbiddenPatterns(files, forbiddenPatterns);
    checks.push("forbiddenPatterns=clear");
  }

  return {
    ok: true,
    checks
  };
}
