import { normalizeCliPath, splitCliPath } from "./path-utils.mjs";

function parsePatternSegment(segment) {
  if (segment === "*" || segment === "**") {
    return {
      kind: "multiWildcard"
    };
  }

  const multiCapture = segment.match(/^\{([A-Za-z0-9_]+)\*\}$/);
  if (multiCapture) {
    return {
      kind: "multiCapture",
      name: multiCapture[1]
    };
  }

  const singleCapture = segment.match(/^\{([A-Za-z0-9_]+)(?:=([^}]+))?\}$/);
  if (singleCapture) {
    return {
      kind: "singleCapture",
      name: singleCapture[1],
      allowedValues: singleCapture[2]?.split("|") ?? null
    };
  }

  return {
    kind: "literal",
    value: segment
  };
}

function mergeCaptures(existing, next) {
  if (!next) {
    return existing;
  }

  return {
    ...existing,
    ...next
  };
}

function matchPatternSegments(patternSegments, actualSegments, patternIndex, actualIndex, captures) {
  if (patternIndex === patternSegments.length) {
    return actualIndex === actualSegments.length ? captures : null;
  }

  const segment = parsePatternSegment(patternSegments[patternIndex]);

  if (segment.kind === "multiWildcard" || segment.kind === "multiCapture") {
    for (let end = actualIndex; end <= actualSegments.length; end += 1) {
      const nextCaptures = segment.kind === "multiCapture"
        ? mergeCaptures(captures, {
            [segment.name]: actualSegments.slice(actualIndex, end).join("/")
          })
        : captures;
      const matched = matchPatternSegments(
        patternSegments,
        actualSegments,
        patternIndex + 1,
        end,
        nextCaptures
      );

      if (matched) {
        return matched;
      }
    }

    return null;
  }

  if (actualIndex >= actualSegments.length) {
    return null;
  }

  const actualSegment = actualSegments[actualIndex];
  if (segment.kind === "literal") {
    if (segment.value !== actualSegment) {
      return null;
    }

    return matchPatternSegments(
      patternSegments,
      actualSegments,
      patternIndex + 1,
      actualIndex + 1,
      captures
    );
  }

  if (segment.allowedValues && !segment.allowedValues.includes(actualSegment)) {
    return null;
  }

  return matchPatternSegments(
    patternSegments,
    actualSegments,
    patternIndex + 1,
    actualIndex + 1,
    mergeCaptures(captures, {
      [segment.name]: actualSegment
    })
  );
}

export function matchCliPathPattern(pattern, pathValue) {
  const normalizedPattern = normalizeCliPath(pattern);
  const normalizedPath = normalizeCliPath(pathValue);

  if (!normalizedPattern || !normalizedPath) {
    return null;
  }

  const captures = matchPatternSegments(
    splitCliPath(normalizedPattern),
    splitCliPath(normalizedPath),
    0,
    0,
    {}
  );

  if (!captures) {
    return null;
  }

  return {
    pattern: normalizedPattern,
    path: normalizedPath,
    captures
  };
}

export function matchCliPathPatterns(patterns = [], pathValue) {
  for (const pattern of patterns) {
    const matched = matchCliPathPattern(pattern, pathValue);
    if (matched) {
      return matched;
    }
  }

  return null;
}

export function renderTemplate(template, values = {}, { normalizePath = false } = {}) {
  const rendered = String(template ?? "").replace(/\{([A-Za-z0-9_]+)\}/g, (_, key) => {
    const value = values[key];
    return value === undefined || value === null ? "" : String(value);
  });

  if (!normalizePath) {
    return rendered;
  }

  return normalizeCliPath(rendered.replace(/^\/+/, ""));
}
