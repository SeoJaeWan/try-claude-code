import { readFile } from "node:fs/promises";

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
  const content = await readFile(templatePath, "utf8");
  return renderTemplate(content, context);
}
