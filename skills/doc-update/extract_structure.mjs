#!/usr/bin/env node
/**
 * extract_structure.mjs - Next.js routes and Prisma schema pre-extraction.
 *
 * Reads changes.json (from output directory, default: .claude/try-claude/codemaps/) and for each
 * changed/added file:
 *   - Detects Next.js page/layout/route files and extracts route from path
 *   - Detects Prisma schema files and parses model names and fields
 *
 * Outputs extracted_structure.json to the output directory.
 *
 * Usage: node extract_structure.mjs [--output-dir <path>]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..", "..", "..");

function resolveOutputDir() {
  const idx = process.argv.indexOf("--output-dir");
  if (idx !== -1 && process.argv[idx + 1]) {
    return path.resolve(process.argv[idx + 1]);
  }
  return path.join(PROJECT_ROOT, ".claude", "try-claude", "codemaps");
}

const OUTPUT_DIR = resolveOutputDir();
const CHANGES_FILE = path.join(OUTPUT_DIR, "changes.json");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "extracted_structure.json");
const NEXTJS_ROUTE_FILES = new Set([
  "page.tsx",
  "page.ts",
  "page.jsx",
  "page.js",
  "layout.tsx",
  "layout.ts",
  "layout.jsx",
  "layout.js",
  "route.ts",
  "route.js",
]);

function nowTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())}`;
}

function writeEmptyStructure() {
  const empty = {
    nextjs_routes: [],
    prisma_models: [],
    fallback_files: [],
    last_scan: nowTimestamp(),
  };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(empty, null, 2), "utf8");
}

function loadChanges() {
  if (!fs.existsSync(CHANGES_FILE)) {
    return null;
  }
  try {
    const data = JSON.parse(fs.readFileSync(CHANGES_FILE, "utf8"));
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

function isNextjsFile(filePath) {
  const posixPath = filePath.split(path.sep).join("/");
  const parts = posixPath.split("/");
  const filename = parts[parts.length - 1];
  if (!NEXTJS_ROUTE_FILES.has(filename)) {
    return false;
  }
  return parts.includes("app") || parts.includes("pages");
}

function isPrismaSchema(filePath) {
  const filename = filePath.split(path.sep).join("/").split("/").pop() || "";
  return filename === "schema.prisma";
}

function extractNextjsRoute(filePath) {
  const posixPath = filePath.split(path.sep).join("/");
  const parts = posixPath.split("/");
  const filename = parts[parts.length - 1];

  let routeType = "page";
  if (filename.startsWith("route")) {
    routeType = "route";
  } else if (filename.startsWith("layout")) {
    routeType = "layout";
  }

  let anchorIndex = -1;
  for (let i = 0; i < parts.length; i += 1) {
    if (parts[i] === "app" || parts[i] === "pages") {
      anchorIndex = i;
      break;
    }
  }
  if (anchorIndex < 0) {
    return null;
  }

  let route = "/";
  if (parts[anchorIndex] === "app") {
    let routeParts = parts.slice(anchorIndex + 1, -1);
    routeParts = routeParts.filter((seg) => !/^\(.*\)$/.test(seg));
    route = routeParts.length > 0 ? `/${routeParts.join("/")}` : "/";
  } else {
    const routeParts = parts.slice(anchorIndex + 1, -1);
    const stem = filename.includes(".") ? filename.slice(0, filename.lastIndexOf(".")) : filename;
    const routePartsWithStem = stem === "index" ? routeParts : [...routeParts, stem];
    route = routePartsWithStem.length > 0 ? `/${routePartsWithStem.join("/")}` : "/";
  }

  return { route, file: posixPath, type: routeType };
}

function parsePrismaSchema(content, filePath) {
  const models = [];
  const lines = content.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const modelMatch = line.match(/^\s*model\s+(\w+)\s*\{/);
    if (!modelMatch) {
      i += 1;
      continue;
    }

    const modelName = modelMatch[1];
    const fields = [];
    i += 1;
    let braceDepth = 1;

    while (i < lines.length && braceDepth > 0) {
      const fieldLine = lines[i];
      braceDepth += (fieldLine.match(/\{/g) || []).length;
      braceDepth -= (fieldLine.match(/\}/g) || []).length;

      if (braceDepth > 0) {
        const stripped = fieldLine.trim();
        if (
          stripped &&
          !stripped.startsWith("//") &&
          !stripped.startsWith("@@") &&
          !stripped.startsWith("@") &&
          !stripped.startsWith("}")
        ) {
          const tokens = stripped.split(/\s+/);
          if (tokens.length > 0 && /^\w+$/.test(tokens[0])) {
            fields.push(tokens[0]);
          }
        }
      }
      i += 1;
    }

    models.push({ model: modelName, fields, file: filePath.split(path.sep).join("/") });
  }

  return models;
}

function processFile(filePath, projectRoot) {
  if (isNextjsFile(filePath)) {
    try {
      return [extractNextjsRoute(filePath), null, null];
    } catch {
      return [null, null, filePath];
    }
  }

  if (isPrismaSchema(filePath)) {
    const absPath = path.join(projectRoot, filePath);
    try {
      const content = fs.readFileSync(absPath, "utf8");
      const models = parsePrismaSchema(content, filePath);
      return [null, models, null];
    } catch {
      return [null, null, filePath];
    }
  }

  return [null, null, null];
}

function main() {
  const changes = loadChanges();
  if (!changes) {
    writeEmptyStructure();
    return;
  }

  const filesToProcess = [];
  for (const key of ["changed", "added"]) {
    const value = changes[key];
    if (Array.isArray(value)) {
      filesToProcess.push(...value);
    }
  }

  const projectRoot = PROJECT_ROOT;
  const nextjsRoutes = [];
  const prismaModels = [];
  const fallbackFiles = [];

  for (const filePath of filesToProcess) {
    try {
      const [nextjsEntry, prismaEntries, fallback] = processFile(filePath, projectRoot);
      if (nextjsEntry) {
        nextjsRoutes.push(nextjsEntry);
      }
      if (prismaEntries) {
        prismaModels.push(...prismaEntries);
      }
      if (fallback) {
        fallbackFiles.push(fallback);
      }
    } catch {
      fallbackFiles.push(filePath);
    }
  }

  const result = {
    nextjs_routes: nextjsRoutes,
    prisma_models: prismaModels,
    fallback_files: fallbackFiles,
    last_scan: nowTimestamp(),
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), "utf8");
}

try {
  main();
} catch {
  try {
    writeEmptyStructure();
  } catch {
    // keep silent fallback behavior.
  }
  process.exit(0);
}

