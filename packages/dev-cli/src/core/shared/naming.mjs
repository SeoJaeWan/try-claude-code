function splitWords(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.toLowerCase());
}

export function toPascalCase(value) {
  return splitWords(value)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join("");
}

export function toCamelCase(value) {
  const pascal = toPascalCase(value);
  return pascal ? pascal[0].toLowerCase() + pascal.slice(1) : "";
}
