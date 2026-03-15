import {
  isLowerCasePackageSegment,
  normalizeCliPath,
  splitCliPath
} from "../core/path-utils.mjs";
import { detectSpringBasePackage } from "./backend-utils.mjs";

function createValidationError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

function assertLowerCasePackagePath(filePath) {
  const segments = splitCliPath(normalizeCliPath(filePath));
  if (!segments.length) {
    throw createValidationError("INVALID_PACKAGE_PATH", "Package path cannot be empty", {
      path: filePath
    });
  }

  for (const segment of segments) {
    if (!isLowerCasePackageSegment(segment)) {
      throw createValidationError(
        "INVALID_PACKAGE_SEGMENT",
        "Backend package segments must use lower-case",
        {
          path: filePath,
          segment
        }
      );
    }
  }
}

function assertPascalCase(name) {
  if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) {
    throw createValidationError("INVALID_NAME", "Class name must use PascalCase", {
      name
    });
  }
}

export async function validateBackendRequest({
  commandName,
  args,
  repoRoot
}) {
  const checks = [];

  if (["module", "requestDto", "responseDto", "entity"].includes(commandName)) {
    if (args.name) {
      assertPascalCase(args.name);
      checks.push("class.name=PascalCase");
    }

    if (args.path) {
      assertLowerCasePackagePath(args.path);
      checks.push("package.segmentCase=lower-case");
    }

    if (!args.basePackage) {
      const detectedBasePackage = await detectSpringBasePackage(repoRoot);
      if (!detectedBasePackage) {
        throw createValidationError(
          "ROOT_PACKAGE_NOT_FOUND",
          "Spring root package could not be detected. Provide basePackage in the JSON spec.",
          {
            command: commandName
          }
        );
      }
    }
  }

  return {
    ok: true,
    checks
  };
}
