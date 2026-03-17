import { readFile } from "node:fs/promises";

import { createCliError } from "./recipe-utils.mjs";

function resolveValue(context, key) {
  return key.split(".").reduce((current, part) => current?.[part], context);
}

export function renderTemplate(content, context) {
  return content.replace(/{{\s*([A-Za-z0-9_.]+)\s*}}/g, (_, key) => {
    const value = resolveValue(context, key);
    return value === undefined || value === null ? "" : String(value);
  });
}

export async function renderTemplateFile(templatePath, context) {
  let content;

  if (typeof templatePath === "string") {
    content = await readFile(templatePath, "utf8");
  } else if (templatePath?.content && typeof templatePath.content === "string") {
    content = templatePath.content;
  } else {
    throw createCliError("MISSING_TEMPLATE", "Template source could not be resolved.");
  }

  return renderTemplate(content, context);
}
