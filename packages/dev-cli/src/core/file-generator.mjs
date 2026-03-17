import { renderTemplateFile } from "./template-engine.mjs";
import { normalizeCliPath } from "./path-utils.mjs";
import { validateRequest } from "./profile-validator.mjs";
import { buildRenderContext } from "./render-context.mjs";
import { createCliError, ensureString } from "./recipe-utils.mjs";
import { resolveCommandArgs } from "./command-args-resolver.mjs";

function replacePattern(pattern, values) {
  return pattern.replace(/\{([A-Za-z0-9_]+)\}/g, (_, key) => values[key] ?? "");
}

function requireArgument(command, argumentName, providedValue) {
  if (!providedValue) {
    throw createCliError(
      "MISSING_ARGUMENT",
      `Missing required argument: ${argumentName}`,
      {
        argument: argumentName,
        command: command.name
      }
    );
  }
}

function resolveTemplatePath(render, spec, key = null) {
  if (key && render.templateContents?.[key]) {
    return {
      content: render.templateContents[key]
    };
  }

  if (key && render.templatePaths?.[key]) {
    return render.templatePaths[key];
  }

  if (render.templateContent) {
    return {
      content: render.templateContent
    };
  }

  if (render.templatePath) {
    return render.templatePath;
  }

  if (!render.templatePaths && !render.templateContents) {
    throw createCliError("MISSING_TEMPLATE", `Missing template for ${render.name ?? "command"}`);
  }

  const variantField = render.templateVariantField;
  const variantRawValue = variantField ? spec[variantField] : undefined;
  const variantKey = render.templateVariantMap?.[variantRawValue] ?? variantRawValue ?? render.defaultVariant;
  const templatePath = render.templatePaths?.[variantKey] ?? (
    render.templateContents?.[variantKey]
      ? {
          content: render.templateContents[variantKey]
        }
      : null
  );

  if (!templatePath) {
    throw createCliError("MISSING_TEMPLATE", `Missing template variant: ${variantKey}`, {
      variantKey
    });
  }

  return templatePath;
}

async function renderFileEntry({
  command,
  args,
  entry,
  context
}) {
  const templatePath = resolveTemplatePath(command.render, args, entry.templateKey ?? null);
  const filePath = normalizeCliPath(
    replacePattern(entry.filePattern, context)
  );

  return {
    path: filePath,
    content: await renderTemplateFile(templatePath, context)
  };
}

export async function generateFiles({
  role,
  profile,
  commandName,
  args,
  repoRoot
}) {
  const baseCommand = profile.commands?.[commandName];
  if (!baseCommand) {
    throw createCliError("UNKNOWN_COMMAND", `Unknown command: ${commandName}`, {
      command: commandName
    });
  }

  const command = {
    name: commandName,
    ...baseCommand
  };

  requireArgument(command, "name", args.name);
  if ((command.execution?.kind ?? "file") === "file" && command.render?.output?.filePattern) {
    requireArgument(command, "path", args.path);
  }

  const { args: enrichedArgs } = await resolveCommandArgs({
    command,
    args,
    repoRoot
  });

  if (command.generator?.requiresBasePackage && enrichedArgs.basePackage) {
    enrichedArgs.basePackage = ensureString(enrichedArgs.basePackage, "basePackage");
  }

  const context = buildRenderContext(command, enrichedArgs);
  const render = command.render ?? {};

  const files = render.fileEntries?.length
    ? await Promise.all(
        render.fileEntries.map((entry) =>
          renderFileEntry({
            command,
            args: enrichedArgs,
            entry,
            context
          })
        )
      )
    : [
        await renderFileEntry({
          command,
          args: enrichedArgs,
          entry: {
            filePattern: render.output?.filePattern
          },
          context
        })
      ];

  await validateRequest({
    role,
    profile,
    commandName,
    args: enrichedArgs,
    files,
    repoRoot
  });

  return files;
}
