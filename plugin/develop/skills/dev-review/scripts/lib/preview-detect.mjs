// Detects which workspace package owns a set of changed files and reads its
// `dev` script. Used by preview-pool to spawn a dev server, and surfaced via
// /api/preview/status so the browser can pick the right framework heuristic.

import fs from "node:fs";
import path from "node:path";

export function detectPreviewTarget(worktreePath, changedFiles = []) {
  if (!worktreePath || !fs.existsSync(worktreePath)) {
    return { supported: false, reason: "worktree not found" };
  }
  const packages = listPackages(worktreePath);
  const chosen = pickPackage(packages, changedFiles, worktreePath);
  if (!chosen) {
    return { supported: false, reason: "no package matched changed files" };
  }
  const pkgJson = readPackageJson(chosen.path);
  if (!pkgJson) {
    return { supported: false, reason: `no package.json at ${chosen.path}` };
  }
  const devCommand = pkgJson.scripts?.dev;
  if (!devCommand) {
    return { supported: false, reason: `no scripts.dev in ${chosen.path}/package.json` };
  }
  return {
    supported: true,
    packagePath: chosen.path,
    devCommand,
    packageManager: detectPackageManager(worktreePath),
    frameworkHint: detectFramework(pkgJson),
  };
}

// Pure function — same heuristic the browser uses, kept here for unit testing.
// Returns null when the file cannot be mapped (Vite/CRA/unknown frameworks).
export function inferRouteFromFile(file, frameworkHint) {
  if (!file || !frameworkHint) return null;
  const norm = String(file).split(path.sep).join("/");
  if (frameworkHint === "next-app") {
    const m = norm.match(/(?:^|\/)app\/(.+)\/page\.(?:tsx|jsx|ts|js|mdx)$/);
    if (!m) return null;
    const segments = m[1]
      .split("/")
      .filter((s) => !(s.startsWith("(") && s.endsWith(")")));
    return "/" + segments.join("/");
  }
  if (frameworkHint === "next-pages") {
    const m = norm.match(/(?:^|\/)pages\/(.+)\.(?:tsx|jsx|ts|js|mdx)$/);
    if (!m) return null;
    const route = m[1].replace(/\/index$/, "").replace(/^index$/, "");
    return route === "" ? "/" : "/" + route;
  }
  return null;
}

function listPackages(worktreePath) {
  const patterns = readWorkspacePatterns(worktreePath);
  const packages = [];
  if (patterns.length === 0) {
    if (fs.existsSync(path.join(worktreePath, "package.json"))) {
      packages.push({ path: worktreePath });
    }
    return packages;
  }
  if (fs.existsSync(path.join(worktreePath, "package.json"))) {
    packages.push({ path: worktreePath });
  }
  for (const pattern of patterns) {
    for (const dir of expandSimpleGlob(worktreePath, pattern)) {
      if (fs.existsSync(path.join(dir, "package.json"))) {
        packages.push({ path: dir });
      }
    }
  }
  return packages;
}

function readWorkspacePatterns(worktreePath) {
  const yamlPath = path.join(worktreePath, "pnpm-workspace.yaml");
  if (fs.existsSync(yamlPath)) {
    try {
      return parseYamlPackagesField(fs.readFileSync(yamlPath, "utf8"));
    } catch {
      return [];
    }
  }
  const rootPkg = readPackageJson(worktreePath);
  if (rootPkg?.workspaces) {
    if (Array.isArray(rootPkg.workspaces)) return rootPkg.workspaces;
    if (Array.isArray(rootPkg.workspaces.packages)) return rootPkg.workspaces.packages;
  }
  return [];
}

function parseYamlPackagesField(content) {
  const out = [];
  let inBlock = false;
  for (const raw of content.split("\n")) {
    const line = raw.replace(/#.*$/, "").trimEnd();
    if (/^packages\s*:/.test(line)) {
      inBlock = true;
      continue;
    }
    if (!inBlock) continue;
    const m = line.match(/^\s*-\s*['"]?([^'"]+)['"]?\s*$/);
    if (m) {
      out.push(m[1]);
    } else if (/^\S/.test(line)) {
      break;
    }
  }
  return out;
}

function pickPackage(packages, changedFiles, worktreePath) {
  if (packages.length === 0) return null;
  if (packages.length === 1) return packages[0];
  const counts = new Map();
  for (const file of changedFiles) {
    const abs = path.resolve(worktreePath, file);
    let best = null;
    let bestLen = -1;
    for (const pkg of packages) {
      const prefix = pkg.path.endsWith(path.sep) ? pkg.path : pkg.path + path.sep;
      if ((abs === pkg.path || abs.startsWith(prefix)) && pkg.path.length > bestLen) {
        best = pkg;
        bestLen = pkg.path.length;
      }
    }
    if (best) counts.set(best.path, (counts.get(best.path) || 0) + 1);
  }
  let chosen = null;
  let chosenCount = 0;
  for (const [pkgPath, count] of counts) {
    if (count > chosenCount) {
      chosen = packages.find((p) => p.path === pkgPath);
      chosenCount = count;
    }
  }
  return chosen || packages[0];
}

function readPackageJson(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
  } catch {
    return null;
  }
}

function detectPackageManager(worktreePath) {
  if (fs.existsSync(path.join(worktreePath, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(worktreePath, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(worktreePath, "bun.lockb"))) return "bun";
  if (fs.existsSync(path.join(worktreePath, "package-lock.json"))) return "npm";
  return "npm";
}

function detectFramework(pkgJson) {
  const deps = { ...(pkgJson.dependencies || {}), ...(pkgJson.devDependencies || {}) };
  if (deps.next) return pkgJson.scripts?.dev?.includes("pages") ? "next-pages" : "next-app";
  if (deps.vite) return "vite";
  if (deps["react-scripts"]) return "cra";
  if (deps.expo) return "expo";
  return "unknown";
}

function expandSimpleGlob(root, pattern) {
  if (pattern.includes("**")) {
    const base = pattern.split("**")[0].replace(/\/$/, "");
    const baseAbs = path.resolve(root, base);
    if (!fs.existsSync(baseAbs)) return [];
    const out = [];
    walkDirs(baseAbs, 3, out);
    return out;
  }
  if (pattern.endsWith("/*")) {
    const base = pattern.slice(0, -2);
    const baseAbs = path.resolve(root, base);
    if (!fs.existsSync(baseAbs)) return [];
    return safeReaddir(baseAbs)
      .filter((e) => e.isDirectory())
      .map((e) => path.join(baseAbs, e.name));
  }
  const exactAbs = path.resolve(root, pattern);
  return fs.existsSync(exactAbs) ? [exactAbs] : [];
}

function walkDirs(dir, maxDepth, out) {
  if (maxDepth < 0) return;
  for (const e of safeReaddir(dir)) {
    if (!e.isDirectory()) continue;
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const sub = path.join(dir, e.name);
    out.push(sub);
    walkDirs(sub, maxDepth - 1, out);
  }
}

function safeReaddir(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}
