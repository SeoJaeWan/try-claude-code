#!/usr/bin/env node
/**
 * Naming Convention Utilities
 * Converts any input format to the correct naming convention.
 *
 * Supported input formats: kebab-case, snake_case, camelCase, PascalCase, mixed
 */

function capitalize(value) {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function splitWords(name) {
  if (!name) {
    return [];
  }

  const parts = name.split(/[-_]/);
  const words = [];

  for (const part of parts) {
    if (!part) {
      continue;
    }
    let subWords = part.replace(/([a-z0-9])([A-Z])/g, "$1_$2");
    subWords = subWords.replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2");
    words.push(...subWords.split("_"));
  }

  return words.filter(Boolean);
}

export function toPascalCase(name) {
  const words = splitWords(name);
  if (words.length === 0) {
    return name;
  }
  return words.map((w) => capitalize(w)).join("");
}

export function toCamelCase(name) {
  const words = splitWords(name);
  if (words.length === 0) {
    return name;
  }
  return words[0].toLowerCase() + words.slice(1).map((w) => capitalize(w)).join("");
}

export function toSnakeCase(name) {
  const words = splitWords(name);
  if (words.length === 0) {
    return name;
  }
  return words.map((w) => w.toLowerCase()).join("_");
}

export function ensureUsePrefix(name) {
  const words = splitWords(name);
  if (words.length === 0) {
    return name;
  }

  if (words[0].toLowerCase() === "use") {
    return "use" + words.slice(1).map((w) => capitalize(w)).join("");
  }

  return "use" + words.map((w) => capitalize(w)).join("");
}

