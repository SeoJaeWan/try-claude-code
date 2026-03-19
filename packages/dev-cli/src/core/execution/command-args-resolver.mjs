import { splitCliPath } from "../shared/path-utils.mjs";
import {
  applyCaseTransform,
  createCliError,
  getNestedValue,
  setNestedValue
} from "../shared/recipe-utils.mjs";
import { renderTemplate } from "../shared/path-patterns.mjs";
import { detectSpringBasePackage } from "../../validators/backend-utils.mjs";

const DETECTORS = {
  springBasePackage: detectSpringBasePackage
};

function stripExtension(fileName) {
  return String(fileName ?? "").replace(/\.[^.]+$/, "");
}

function getResolverContext(args, context = {}) {
  const normalizedFilePath = context.filePath ?? null;
  const fileSegments = normalizedFilePath ? splitCliPath(normalizedFilePath) : [];

  return {
    ...context,
    args,
    filePath: normalizedFilePath,
    fileSegments,
    fileName: fileSegments.at(-1) ?? "",
    parentSegment: fileSegments.at(-2) ?? null
  };
}

function getTemplateValues(context) {
  return {
    ...(context.captures ?? {}),
    filePath: context.filePath ?? "",
    fileName: context.fileName ?? "",
    fileStem: stripExtension(context.fileName ?? ""),
    parentSegment: context.parentSegment ?? ""
  };
}

async function resolveDetectorValue(resolver, projectRoot) {
  const detector = DETECTORS[resolver.detector];
  if (!detector) {
    throw createCliError(
      "INVALID_RECIPE",
      `Unsupported field detector: ${resolver.detector}`,
      {
        detector: resolver.detector
      }
    );
  }

  const value = await detector(projectRoot);
  if (value) {
    return value;
  }

  if (resolver.required === false) {
    return undefined;
  }

  throw createCliError(
    resolver.code ?? "ROOT_PACKAGE_NOT_FOUND",
    resolver.message ?? "Required detected field could not be resolved.",
    resolver.details ?? {}
  );
}

async function resolveFieldValue(resolver, context) {
  switch (resolver.source) {
    case "literal":
      return resolver.value;
    case "template":
      return renderTemplate(
        resolver.template ?? resolver.value ?? "",
        getTemplateValues(context),
        {
          normalizePath: resolver.normalizePath === true
        }
      );
    case "capture":
    case "pathCapture": {
      const rawValue = context.captures?.[resolver.capture];
      if (rawValue === undefined) {
        return undefined;
      }

      const mappedValue = resolver.map?.[rawValue] ?? rawValue;
      return resolver.transform
        ? applyCaseTransform(mappedValue, resolver.transform)
        : mappedValue;
    }
    case "fileName": {
      const fileName = resolver.withoutExtension
        ? stripExtension(context.fileName)
        : context.fileName;
      return resolver.transform
        ? applyCaseTransform(fileName, resolver.transform)
        : fileName;
    }
    case "parentSegment": {
      const segment = context.fileSegments.at(-((resolver.depth ?? 1) + 1));
      if (segment === undefined) {
        return undefined;
      }

      return resolver.transform
        ? applyCaseTransform(segment, resolver.transform)
        : segment;
    }
    case "namePrefixMap": {
      const sourceValue = getNestedValue(context.args, resolver.sourceField ?? "name");
      if (typeof sourceValue !== "string") {
        return undefined;
      }

      const matchedEntry = Object.entries(resolver.prefixMap ?? {})
        .sort((left, right) => right[0].length - left[0].length)
        .find(([prefix]) => sourceValue.startsWith(prefix));

      if (!matchedEntry) {
        return resolver.defaultValue;
      }

      return matchedEntry[1];
    }
    case "detector":
      return resolveDetectorValue(resolver, context.projectRoot);
    default:
      throw createCliError(
        "INVALID_RECIPE",
        `Unsupported field resolver source: ${resolver.source}`,
        {
          source: resolver.source,
          field: resolver.field
        }
      );
  }
}

export async function applyFieldResolvers({
  args,
  resolvers = [],
  projectRoot,
  context = {},
  overwrite = false
}) {
  const resolvedArgs = {
    ...(args ?? {})
  };
  const resolutions = [];

  for (const resolver of resolvers) {
    if (!resolver?.field) {
      continue;
    }

    const currentValue = getNestedValue(resolvedArgs, resolver.field);
    if (!overwrite && currentValue !== undefined) {
      continue;
    }

    const value = await resolveFieldValue(
      resolver,
      getResolverContext(resolvedArgs, {
        ...context,
        projectRoot
      })
    );

    if (value === undefined) {
      continue;
    }

    setNestedValue(resolvedArgs, resolver.field, value);
    resolutions.push({
      field: resolver.field,
      source: resolver.source
    });
  }

  return {
    args: resolvedArgs,
    resolutions
  };
}

export async function resolveCommandArgs({
  command,
  args,
  projectRoot,
  context = {}
}) {
  return applyFieldResolvers({
    args,
    resolvers: command?.fieldResolvers ?? [],
    projectRoot,
    context
  });
}
