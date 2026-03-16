import { existsSync } from "node:fs";
import path from "node:path";

const PROJECT_MARKERS = [
  ".git",
  "package.json",
  "pnpm-workspace.yaml",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts"
];

export function findProjectRoot(startDir) {
  let current = path.resolve(startDir);

  while (true) {
    const hasMarker = PROJECT_MARKERS.some((marker) =>
      existsSync(path.join(current, marker))
    );
    if (hasMarker) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return startDir;
    }
    current = parent;
  }
}

export function findRepoRoot(startDir) {
  return findProjectRoot(startDir);
}

export function normalizeCliPath(value) {
  if (!value) {
    return "";
  }

  const normalized = value.replaceAll("\\", "/").replace(/^\.\/+/, "");
  return normalized.replace(/\/+/g, "/");
}

export function splitCliPath(value) {
  return normalizeCliPath(value).split("/").filter(Boolean);
}

export function isCamelCaseSegment(value) {
  return /^[a-z][A-Za-z0-9]*$/.test(value);
}

export function isLowerCasePackageSegment(value) {
  return /^[a-z][a-z0-9]*$/.test(value);
}

export function isRelativeCliPath(value) {
  return Boolean(value) &&
    !value.startsWith("/") &&
    !/^[A-Za-z]:/.test(value) &&
    !value.includes("..") &&
    !/[?#]/.test(value);
}
