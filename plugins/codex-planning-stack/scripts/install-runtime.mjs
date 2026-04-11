#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginRoot = path.resolve(__dirname, "..");
const templateCodexRoot = path.join(pluginRoot, "templates", ".codex");
const templateAgentsDir = path.join(templateCodexRoot, "agents");
const templateConfigPath = path.join(templateCodexRoot, "config.toml");
const templateSkillsDir = path.join(pluginRoot, "skills");

function parseArgs(argv) {
  const options = {
    projectRoot: process.cwd(),
    skillsMode: "symlink",
    allowCopyFallback: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--project-root") {
      options.projectRoot = path.resolve(argv[++i]);
    } else if (arg === "--skills-mode") {
      options.skillsMode = argv[++i];
    } else if (arg === "--no-copy-fallback") {
      options.allowCopyFallback = false;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!["symlink", "copy"].includes(options.skillsMode)) {
    throw new Error(`Unsupported --skills-mode: ${options.skillsMode}`);
  }

  return options;
}

async function pathExists(targetPath) {
  try {
    await fs.lstat(targetPath);
    return true;
  } catch (error) {
    if (error && error.code === "ENOENT") return false;
    throw error;
  }
}

async function statOrNull(targetPath) {
  try {
    return await fs.lstat(targetPath);
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw error;
  }
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function backupPath(targetPath) {
  if (!(await pathExists(targetPath))) return null;
  const backup = `${targetPath}.bak-${timestamp()}`;
  await fs.rename(targetPath, backup);
  return backup;
}

async function ensureDir(targetPath) {
  await fs.mkdir(targetPath, { recursive: true });
}

async function sameFileContent(aPath, bPath) {
  const [a, b] = await Promise.all([
    fs.readFile(aPath, "utf8"),
    fs.readFile(bPath, "utf8"),
  ]);
  return a === b;
}

async function installSkills(projectCodexDir, skillsMode, allowCopyFallback) {
  const destSkillsPath = path.join(projectCodexDir, "skills");
  const current = await statOrNull(destSkillsPath);

  if (skillsMode === "copy") {
    if (current && current.isSymbolicLink()) {
      await backupPath(destSkillsPath);
    }
    await fs.cp(templateSkillsDir, destSkillsPath, {
      recursive: true,
      force: true,
    });
    return { mode: "copy", target: templateSkillsDir };
  }

  if (current && current.isSymbolicLink()) {
    const currentTarget = await fs.readlink(destSkillsPath);
    const resolvedCurrent = path.resolve(path.dirname(destSkillsPath), currentTarget);
    if (path.resolve(resolvedCurrent) === path.resolve(templateSkillsDir)) {
      return { mode: "symlink", target: templateSkillsDir, unchanged: true };
    }
  }

  if (current) {
    await backupPath(destSkillsPath);
  }

  try {
    const symlinkType = process.platform === "win32" ? "junction" : "dir";
    await fs.symlink(path.resolve(templateSkillsDir), destSkillsPath, symlinkType);
    return { mode: "symlink", target: templateSkillsDir };
  } catch (error) {
    if (!allowCopyFallback) throw error;
    await fs.cp(templateSkillsDir, destSkillsPath, {
      recursive: true,
      force: true,
    });
    return {
      mode: "copy",
      target: templateSkillsDir,
      fallbackReason: error.code || error.message,
    };
  }
}

async function installAgents(projectCodexDir) {
  const destAgentsDir = path.join(projectCodexDir, "agents");
  const current = await statOrNull(destAgentsDir);

  if (current && !current.isDirectory()) {
    await backupPath(destAgentsDir);
  }

  await ensureDir(destAgentsDir);

  const templateEntries = await fs.readdir(templateAgentsDir, { withFileTypes: true });
  const copied = [];
  const backedUp = [];

  for (const entry of templateEntries) {
    if (!entry.isFile()) continue;
    const sourcePath = path.join(templateAgentsDir, entry.name);
    const destPath = path.join(destAgentsDir, entry.name);

    if (await pathExists(destPath)) {
      if (await sameFileContent(sourcePath, destPath)) {
        continue;
      }
      const backup = await backupPath(destPath);
      if (backup) backedUp.push(backup);
    }

    await fs.copyFile(sourcePath, destPath);
    copied.push(destPath);
  }

  return { copied, backedUp };
}

function mergeAgentsConfig(existingContent, templateContent) {
  const templateMatch = templateContent.match(/\[agents\]\s*[\r\n]+max_threads\s*=\s*(\d+)/m);
  const templateValue = templateMatch ? templateMatch[1] : "10";

  if (!/\[agents\]/m.test(existingContent)) {
    return `${existingContent.replace(/\s*$/, "")}\n\n[agents]\nmax_threads = ${templateValue}\n`;
  }

  const hasMaxThreads = /^\s*max_threads\s*=\s*\d+/m.test(
    existingContent
      .split(/\[agents\]/m)
      .slice(1, 2)
      .join("")
  );
  if (hasMaxThreads) return existingContent;

  return existingContent.replace(/\[agents\]\s*\n/, `[agents]\nmax_threads = ${templateValue}\n`);
}

async function installConfig(projectCodexDir) {
  const destConfigPath = path.join(projectCodexDir, "config.toml");

  if (!(await pathExists(destConfigPath))) {
    await fs.copyFile(templateConfigPath, destConfigPath);
    return { created: true, path: destConfigPath };
  }

  const [existingContent, templateContent] = await Promise.all([
    fs.readFile(destConfigPath, "utf8"),
    fs.readFile(templateConfigPath, "utf8"),
  ]);

  const merged = mergeAgentsConfig(existingContent, templateContent);
  if (merged !== existingContent) {
    await fs.writeFile(destConfigPath, merged, "utf8");
    return { updated: true, path: destConfigPath };
  }

  return { unchanged: true, path: destConfigPath };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const projectRoot = options.projectRoot;
  const projectCodexDir = path.join(projectRoot, ".codex");

  await ensureDir(projectCodexDir);

  const skills = await installSkills(
    projectCodexDir,
    options.skillsMode,
    options.allowCopyFallback
  );
  const agents = await installAgents(projectCodexDir);
  const config = await installConfig(projectCodexDir);

  const summary = {
    pluginRoot,
    projectRoot,
    skills,
    agents,
    config,
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
