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

function assertHookName(name) {
  if (!/^use[A-Z][A-Za-z0-9]*$/.test(name)) {
    throw createValidationError("INVALID_NAME", "Hook name must start with use", {
      name
    });
  }
}

function assertApiHookPath(pathValue, kind) {
  const normalized = normalizeCliPath(pathValue);
  const requiredSegment = kind === "mutation" ? "mutations" : "queries";

  if (!normalized.includes(`/apis/`) && !normalized.startsWith("hooks/apis/")) {
    throw createValidationError("INVALID_API_PATH", "API hook path must include hooks/apis", {
      path: pathValue
    });
  }

  if (!normalized.endsWith(`/${requiredSegment}`)) {
    throw createValidationError(
      "INVALID_API_PATH",
      `API hook path must end with ${requiredSegment}`,
      {
        path: pathValue,
        kind
      }
    );
  }
}

function assertPascalCase(name) {
  if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) {
    throw createValidationError("INVALID_NAME", "Type name must use PascalCase", {
      name
    });
  }
}

export async function validateFrontendRequest({
  profile,
  commandName,
  args
}) {
  const command = profile.commands?.[commandName];
  const checks = [];

  if (commandName === "hook") {
    if (args.name) {
      assertHookName(args.name);
      checks.push("hook.name=use*");
    }

    if (args.path) {
      assertCamelCasePath(
        args.path,
        command?.rules?.enforced?.pathPolicy?.allowedRoots
      );
      checks.push("path.segmentCase=camelCase");
    }
  }

  if (commandName === "apiHook") {
    if (args.name) {
      assertHookName(args.name);
      checks.push("apiHook.name=use*");
    }

    if (args.path) {
      assertCamelCasePath(args.path, command?.rules?.enforced?.pathPolicy?.allowedRoots);
      assertApiHookPath(args.path, args.kind);
      checks.push("apiHook.path=queries|mutations");
    }
  }

  if (commandName === "type") {
    if (args.name) {
      assertPascalCase(args.name);
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

  return {
    ok: true,
    checks
  };
}
