function createCliError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

function resolvePath(target, pathValue) {
  return pathValue.split(".").reduce((current, segment) => current?.[segment], target);
}

export function resolveRefs(value, priorResults) {
  if (Array.isArray(value)) {
    return value.map((item) => resolveRefs(item, priorResults));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const keys = Object.keys(value);
  if (keys.length === 1 && keys[0] === "$ref") {
    if (typeof value.$ref !== "string" || !value.$ref.trim()) {
      throw createCliError("INVALID_REF", "Reference must be a non-empty string.");
    }

    const [opId, ...pathParts] = value.$ref.split(".");
    const priorResult = priorResults[opId];
    if (!priorResult) {
      throw createCliError("INVALID_REF", `Unknown or forward reference: ${value.$ref}`, {
        ref: value.$ref
      });
    }

    const resolved = resolvePath(priorResult, pathParts.join("."));
    if (resolved === undefined) {
      throw createCliError("INVALID_REF", `Reference path could not be resolved: ${value.$ref}`, {
        ref: value.$ref
      });
    }

    return resolved;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      resolveRefs(nestedValue, priorResults)
    ])
  );
}
