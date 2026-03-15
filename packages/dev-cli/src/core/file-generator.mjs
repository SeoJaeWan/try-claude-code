import { renderTemplateFile } from "./template-engine.mjs";
import { normalizeCliPath } from "./path-utils.mjs";
import { validateRequest } from "./profile-validator.mjs";
import { detectSpringBasePackage } from "../validators/backend-utils.mjs";

function replacePattern(pattern, values) {
  return pattern.replace(/\{([A-Za-z0-9_]+)\}/g, (_, key) => values[key] ?? "");
}

function createCliError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
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

function resolveTypeName(name, kind) {
  if (kind === "type") {
    return name;
  }

  return name.endsWith("Props") || name.endsWith("Response") || name.endsWith("Request")
    ? name
    : `${name}`;
}

async function createSingleFileGeneration({
  role,
  profile,
  commandName,
  command,
  args,
  repoRoot
}) {
  requireArgument(command, "name", args.name);
  requireArgument(command, "path", args.path);

  let basePackage = args.basePackage;
  if (role === "backend" && command.generator?.requiresBasePackage && !basePackage) {
    basePackage = await detectSpringBasePackage(repoRoot);
    if (!basePackage) {
      throw createCliError(
        "ROOT_PACKAGE_NOT_FOUND",
        "Spring root package could not be detected. Provide --base-package.",
        {
          command: commandName
        }
      );
    }
  }

  const templatePath =
    command.templatePaths?.[args.kind ?? command.defaults?.kind] ??
    command.templatePath;

  if (!templatePath) {
    throw createCliError("MISSING_TEMPLATE", `Missing template for ${commandName}`);
  }

  const context = {
    ...args,
    basePackage,
    name: args.name,
    className: args.name,
    componentName: args.name,
    hookName: args.name,
    typeName: resolveTypeName(args.name, args.kind),
    interfaceName:
      commandName === "component" ? `${args.name}Props` : `${args.name}`,
    basePackagePath: basePackage ? basePackage.replaceAll(".", "/") : "",
    basePackage: basePackage ?? "",
    packagePath: args.path,
    packagePathDot: args.path ? args.path.replaceAll("/", ".") : "",
    featurePath: args.path,
    domainName: args.path.split("/").filter(Boolean).slice(-1)[0] ?? args.path,
    queryKind: args.kind
  };

  const filePath = normalizeCliPath(
    replacePattern(command.output.filePattern, {
      path: args.path,
      name: args.name,
      basePackagePath: basePackage ? basePackage.replaceAll(".", "/") : ""
    })
  );

  const content = await renderTemplateFile(templatePath, context);
  const files = [
    {
      path: filePath,
      content
    }
  ];

  await validateRequest({
    role,
    profile,
    commandName,
    args: {
      ...args,
      basePackage
    },
    files,
    repoRoot
  });

  return files;
}

async function createSpringModuleGeneration({
  role,
  profile,
  commandName,
  command,
  args,
  repoRoot
}) {
  requireArgument(command, "name", args.name);
  requireArgument(command, "path", args.path);

  let basePackage = args.basePackage;
  if (!basePackage) {
    basePackage = await detectSpringBasePackage(repoRoot);
    if (!basePackage) {
      throw createCliError(
        "ROOT_PACKAGE_NOT_FOUND",
        "Spring root package could not be detected. Provide --base-package.",
        {
          command: commandName
        }
      );
    }
  }

  const templateKeys = ["controller", "service", "repository", "globalExceptionHandler"];
  const fileEntries = [
    {
      key: "controller",
      path: `src/main/java/${basePackage.replaceAll(".", "/")}/${args.path}/controller/${args.name}Controller.java`
    },
    {
      key: "service",
      path: `src/main/java/${basePackage.replaceAll(".", "/")}/${args.path}/service/${args.name}Service.java`
    },
    {
      key: "repository",
      path: `src/main/java/${basePackage.replaceAll(".", "/")}/${args.path}/repository/${args.name}Repository.java`
    },
    {
      key: "globalExceptionHandler",
      path: `src/main/java/${basePackage.replaceAll(".", "/")}/global/exception/GlobalExceptionHandler.java`
    }
  ];

  const context = {
    ...args,
    basePackage,
    className: args.name,
    featurePackage: `${basePackage}.${args.path.replaceAll("/", ".")}`,
    packagePathDot: args.path.replaceAll("/", ".")
  };

  const files = [];
  for (const templateKey of templateKeys) {
    const templatePath = command.templatePaths?.[templateKey];
    if (!templatePath) {
      throw createCliError("MISSING_TEMPLATE", `Missing template variant: ${templateKey}`);
    }

    const entry = fileEntries.find((item) => item.key === templateKey);
    files.push({
      path: normalizeCliPath(entry.path),
      content: await renderTemplateFile(templatePath, context)
    });
  }

  await validateRequest({
    role,
    profile,
    commandName,
    args: {
      ...args,
      basePackage
    },
    files,
    repoRoot
  });

  return files;
}

export async function generateFiles({
  role,
  profile,
  commandName,
  args,
  repoRoot
}) {
  const command = profile.commands?.[commandName];
  if (!command) {
    throw createCliError("UNKNOWN_COMMAND", `Unknown command: ${commandName}`, {
      command: commandName
    });
  }

  const generatorKind = command.generator?.kind ?? "singleFile";
  const enrichedCommand = {
    ...command,
    name: commandName
  };

  if (generatorKind === "singleFile") {
    return createSingleFileGeneration({
      role,
      profile,
      commandName,
      command: enrichedCommand,
      args,
      repoRoot
    });
  }

  if (generatorKind === "springModule") {
    return createSpringModuleGeneration({
      role,
      profile,
      commandName,
      command: enrichedCommand,
      args,
      repoRoot
    });
  }

  throw createCliError(
    "UNSUPPORTED_GENERATOR",
    `Unsupported generator kind: ${generatorKind}`,
    {
      command: commandName,
      generatorKind
    }
  );
}
