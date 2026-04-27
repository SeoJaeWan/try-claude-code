#!/usr/bin/env node

import { mkdir, readlink, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { existsSync, lstatSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const argv = process.argv.slice(2);

function takeFlag(name) {
  const idx = argv.indexOf(name);
  if (idx < 0) return null;
  const value = argv[idx + 1];
  if (!value || value.startsWith("--")) return null;
  return value;
}

function hasFlag(name) {
  return argv.includes(name);
}

if (hasFlag("--help") || hasFlag("-h")) {
  console.log("Usage: node .codex/tools/stage-review-wiki.mjs [--workspace-root <path>] [--source-wiki-root <path>] [--destination-root <path>] [--link-type junction|dir]");
  console.log("");
  console.log("Prepares ./.codex/review-wiki/sync/current as a live link to ~/.codex/reviewWiki/wiki.");
  process.exit(0);
}

const workspaceRootInput = takeFlag("--workspace-root") || process.cwd();
const sourceWikiRootInput = takeFlag("--source-wiki-root") || path.join(os.homedir(), ".codex", "reviewWiki", "wiki");
const destinationRootInput =
  takeFlag("--destination-root") ||
  path.join(workspaceRootInput, ".codex", "review-wiki", "sync", "current");
const requestedLinkType = takeFlag("--link-type");

function fullPath(value) {
  return path.resolve(value);
}

function ensureExistingDirectory(label, value) {
  const resolved = fullPath(value);
  if (!existsSync(resolved) || !lstatSync(resolved).isDirectory()) {
    throw new Error(`${label} not found: ${resolved}`);
  }
  return realpath(resolved);
}

function isPathInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

async function removeExistingDestination(destinationRoot) {
  if (!existsSync(destinationRoot)) return;

  const info = lstatSync(destinationRoot);
  if (info.isSymbolicLink()) {
    await rm(destinationRoot, { force: true });
    return;
  }

  if (process.platform === "win32") {
    try {
      await readlink(destinationRoot);
      await rm(destinationRoot, { force: true, recursive: true });
      return;
    } catch {
      // Fall through for ordinary directories.
    }
  }

  await rm(destinationRoot, { force: true, recursive: true });
}

function resolveLinkType() {
  if (requestedLinkType) {
    if (!["junction", "dir"].includes(requestedLinkType)) {
      throw new Error("--link-type must be junction or dir");
    }
    return requestedLinkType;
  }
  return process.platform === "win32" ? "junction" : "dir";
}

async function main() {
  const resolvedWorkspaceRoot = await ensureExistingDirectory("Workspace root", workspaceRootInput);
  const resolvedSourceWikiRoot = await ensureExistingDirectory("Review wiki source root", sourceWikiRootInput);
  const resolvedDestinationRoot = fullPath(destinationRootInput);
  const destinationParent = path.dirname(resolvedDestinationRoot);
  const manifestPath = path.join(destinationParent, `${path.basename(resolvedDestinationRoot)}.manifest.json`);

  if (!isPathInside(resolvedWorkspaceRoot, resolvedDestinationRoot)) {
    throw new Error(`Destination root must stay inside the workspace: ${resolvedDestinationRoot}`);
  }

  if (resolvedSourceWikiRoot.toLowerCase() === resolvedDestinationRoot.toLowerCase()) {
    throw new Error(`Source root and destination root must differ: ${resolvedDestinationRoot}`);
  }

  await removeExistingDestination(resolvedDestinationRoot);
  await rm(manifestPath, { force: true });
  await mkdir(destinationParent, { recursive: true });

  const linkType = resolveLinkType();
  await symlink(resolvedSourceWikiRoot, resolvedDestinationRoot, linkType);

  const manifest = {
    source_root: resolvedSourceWikiRoot,
    destination_root: resolvedDestinationRoot,
    mode: "Link",
    link_type: linkType === "junction" ? "Junction" : "SymbolicLink",
    prepared_at_utc: new Date().toISOString()
  };

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Prepared live review wiki planning link at ${resolvedDestinationRoot}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
