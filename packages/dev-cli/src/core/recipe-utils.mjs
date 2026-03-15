import { toCamelCase, toPascalCase } from "./naming.mjs";
import { normalizeCliPath } from "./path-utils.mjs";

export function createCliError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

export function pushNormalization(normalizations, field, from, to, reason) {
  if (from !== to) {
    normalizations.push({
      field,
      from,
      to,
      reason
    });
  }
}

export function ensureString(value, field, code = "INVALID_SPEC") {
  if (typeof value !== "string" || value.trim() === "") {
    throw createCliError(code, `Missing or invalid field: ${field}`, {
      field
    });
  }

  return value.trim();
}

export function ensureArray(value, field) {
  if (!Array.isArray(value)) {
    throw createCliError("INVALID_SPEC", `Field ${field} must be an array.`, {
      field
    });
  }

  return value;
}

export function ensureObject(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw createCliError("INVALID_SPEC", `Field ${field} must be an object.`, {
      field
    });
  }

  return value;
}

export function normalizePathField(value, field = "path") {
  return normalizeCliPath(ensureString(value, field));
}

export function getPolicyValue(command, group, key, fallback = "") {
  return command.namingPolicy?.[group]?.[key] ?? fallback;
}

export function applyCaseTransform(value, style) {
  if (!value) {
    return "";
  }

  if (style === "pascal") {
    return toPascalCase(value);
  }

  if (style === "camel") {
    return toCamelCase(value);
  }

  if (style === "upperSnake") {
    return value
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .replace(/[-/\s]+/g, "_")
      .replace(/__+/g, "_")
      .toUpperCase();
  }

  if (style === "preserve") {
    return value;
  }

  throw createCliError("INVALID_RECIPE", `Unsupported case style: ${style}`, {
    style
  });
}

export function prependPrefix(rawValue, prefix, style = "pascal") {
  const normalizedBase = applyCaseTransform(rawValue, style);
  return `${prefix}${normalizedBase}`;
}

export function cloneValue(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

export function setNestedValue(target, path, value) {
  const segments = path.split(".");
  let current = target;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    if (!current[segment] || typeof current[segment] !== "object" || Array.isArray(current[segment])) {
      current[segment] = {};
    }
    current = current[segment];
  }

  current[segments[segments.length - 1]] = value;
}

export function getNestedValue(target, path) {
  return path.split(".").reduce((current, segment) => current?.[segment], target);
}

export function mergeDefaults(spec, defaults = {}) {
  if (!defaults || typeof defaults !== "object" || Array.isArray(defaults)) {
    return cloneValue(spec ?? {});
  }

  const result = cloneValue(spec ?? {}) ?? {};
  for (const [key, value] of Object.entries(defaults)) {
    if (!(key in result) || result[key] === undefined) {
      result[key] = cloneValue(value);
      continue;
    }

    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      result[key] &&
      typeof result[key] === "object" &&
      !Array.isArray(result[key])
    ) {
      result[key] = mergeDefaults(result[key], value);
    }
  }

  return result;
}
