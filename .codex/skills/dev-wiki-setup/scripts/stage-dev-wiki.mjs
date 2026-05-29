#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
const argv = process.argv.slice(2);
const DEFAULT_REPO = "https://github.com/SeoJaeWan/dev-wiki.git";
const DEFAULT_BRANCH = "main";

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
  console.log("Usage: node .codex/skills/dev-wiki-setup/scripts/stage-dev-wiki.mjs [--workspace-root <path>] [--project <name>] [--repo <git-url>] [--branch <name>]");
  console.log("");
  console.log("Prepares ./.codex/dev-wiki/source as the project-local clone of the shared dev wiki Git repository.");
  console.log("Creates ./.codex/dev-wiki/config.json when the workspace opts in through setup.");
  process.exit(0);
}

function fullPath(value) {
  return path.resolve(value);
}

function ensureDirectory(label, value) {
  if (!existsSync(value) || !lstatSync(value).isDirectory()) {
    throw new Error(`${label} not found: ${value}`);
  }
}

function runGit(args, cwd) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (result.status !== 0) {
    const detail = [result.stderr.trim(), result.stdout.trim()].filter(Boolean).join("\n");
    throw new Error(`git ${args.join(" ")} failed${detail ? `:\n${detail}` : ""}`);
  }

  return result.stdout.trim();
}

async function readJsonIfExists(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw new Error(`Invalid JSON at ${filePath}: ${error.message}`);
  }
}

function readPackageName(workspaceRoot) {
  const packagePath = path.join(workspaceRoot, "package.json");
  if (!existsSync(packagePath)) return null;

  try {
    const pkg = JSON.parse(readFileSync(packagePath, "utf8").replace(/^\uFEFF/, ""));
    if (typeof pkg.name === "string" && pkg.name.trim()) {
      return pkg.name.split("/").pop();
    }
  } catch {
    return null;
  }

  return null;
}

function assertSafeProjectName(project) {
  if (!project || typeof project !== "string") {
    throw new Error("Dev wiki project name is required.");
  }
  if (project.includes("/") || project.includes("\\") || project === "." || project === "..") {
    throw new Error(`Unsafe dev wiki project name: ${project}`);
  }
}

function normalizeRemote(value) {
  return String(value || "").trim().replace(/\/$/, "").replace(/\.git$/, "");
}

function ensureGitRepo(sourceRoot) {
  ensureDirectory("Dev wiki source root", sourceRoot);
  runGit(["rev-parse", "--is-inside-work-tree"], sourceRoot);
}

function writeTextIfMissing(filePath, content) {
  if (existsSync(filePath)) return false;
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, "utf8");
  return true;
}

function writeJsonIfMissing(filePath, value) {
  return writeTextIfMissing(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function upsertConfig(configPath, nextConfig) {
  const existing = await readJsonIfExists(configPath);
  const merged = {
    repo: nextConfig.repo,
    branch: nextConfig.branch,
    project: nextConfig.project
  };

  if (
    existing &&
    existing.repo === merged.repo &&
    existing.branch === merged.branch &&
    existing.project === merged.project
  ) {
    return false;
  }

  mkdirSync(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  return true;
}

async function upsertProjectsIndex(filePath, project) {
  const existing = (await readJsonIfExists(filePath)) || { projects: [] };
  const projects = Array.isArray(existing.projects) ? existing.projects : [];
  if (!projects.includes(project)) {
    projects.push(project);
    projects.sort();
    mkdirSync(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify({ projects }, null, 2)}\n`, "utf8");
    return true;
  }
  return false;
}

function bootstrapObsidian(sourceRoot) {
  const obsidianRoot = path.join(sourceRoot, ".obsidian");
  mkdirSync(obsidianRoot, { recursive: true });

  writeJsonIfMissing(path.join(obsidianRoot, "app.json"), {
    alwaysUpdateLinks: true,
    newFileLocation: "folder",
    newFileFolderPath: "_meta"
  });
  writeJsonIfMissing(path.join(obsidianRoot, "appearance.json"), {
    baseFontSize: 16,
    cssTheme: ""
  });
  writeJsonIfMissing(path.join(obsidianRoot, "core-plugins.json"), [
    "file-explorer",
    "global-search",
    "graph",
    "backlink",
    "outgoing-link",
    "tag-pane",
    "page-preview"
  ]);
  writeJsonIfMissing(path.join(obsidianRoot, "graph.json"), {
    "collapse-filter": false,
    search: "",
    showTags: true,
    showAttachments: false,
    hideUnresolved: false,
    showOrphans: true
  });
}

function bootstrapSourceRoot(sourceRoot) {
  mkdirSync(path.join(sourceRoot, "_meta"), { recursive: true });
  writeTextIfMissing(
    path.join(sourceRoot, "README.md"),
    [
      "# Dev Wiki",
      "",
      "프로젝트별 개발 규칙, 구조, 작업 흐름, 그래프를 관리하는 Obsidian vault입니다.",
      "",
      "최상단의 각 프로젝트 폴더가 독립적인 dev wiki입니다.",
      ""
    ].join("\n")
  );
  writeTextIfMissing(
    path.join(sourceRoot, "_meta", "schema.md"),
    [
      "# Dev Wiki Schema",
      "",
      "각 프로젝트 폴더는 `README.md`, `project.json`, `conventions/`, `architecture/`, `workflows/`, `graph/`를 기본 구조로 사용합니다.",
      "",
      "`history/` 디렉터리는 만들지 않습니다. 변경 이력은 Git commit으로 관리합니다.",
      ""
    ].join("\n")
  );
}

function sectionReadme(title, description) {
  return [`# ${title}`, "", description, ""].join("\n");
}

function blankDoc(title, prompt) {
  return [
    `# ${title}`,
    "",
    "## 목적",
    "",
    prompt,
    "",
    "## 규칙",
    "",
    "아직 기록된 규칙이 없습니다.",
    ""
  ].join("\n");
}

function bootstrapProject(sourceRoot, project) {
  const projectRoot = path.join(sourceRoot, project);
  mkdirSync(projectRoot, { recursive: true });

  writeTextIfMissing(
    path.join(projectRoot, "README.md"),
    [
      `# ${project}`,
      "",
      "이 폴더는 프로젝트별 개발 규칙, 아키텍처, 작업 흐름, 그래프를 관리합니다.",
      "",
      "## 문서 묶음",
      "",
      "- [[conventions/README|개발 규칙]]",
      "- [[architecture/README|아키텍처]]",
      "- [[workflows/README|작업 흐름]]",
      "- [[graph/README|프로젝트 그래프]]",
      ""
    ].join("\n")
  );

  writeJsonIfMissing(path.join(projectRoot, "project.json"), {
    project,
    schema_version: 1
  });

  const dirs = ["conventions", "architecture", "workflows", "graph"];
  for (const dir of dirs) {
    mkdirSync(path.join(projectRoot, dir), { recursive: true });
  }

  writeTextIfMissing(path.join(projectRoot, "conventions", "README.md"), sectionReadme("개발 규칙", "코드 작성, 이름, 폴더 배치, 테스트 규칙을 기록합니다."));
  writeTextIfMissing(path.join(projectRoot, "conventions", "coding.md"), blankDoc("코딩 규칙", "코드 작성 방식과 금지 패턴을 기록합니다."));
  writeTextIfMissing(path.join(projectRoot, "conventions", "naming.md"), blankDoc("이름 규칙", "파일, 폴더, 함수, 컴포넌트, 테스트 이름 규칙을 기록합니다."));
  writeTextIfMissing(path.join(projectRoot, "conventions", "folder-structure.md"), blankDoc("폴더 구조 규칙", "새 파일을 어디에 두고 각 폴더가 무엇을 소유하는지 기록합니다."));
  writeTextIfMissing(path.join(projectRoot, "conventions", "testing.md"), blankDoc("테스트 규칙", "테스트 계층, fixture, mock, 검증 명령을 기록합니다."));

  writeTextIfMissing(path.join(projectRoot, "architecture", "README.md"), sectionReadme("아키텍처", "프로젝트 구조, 계층, 모듈 경계, 상태, 외부 경계를 기록합니다."));
  writeTextIfMissing(path.join(projectRoot, "architecture", "overview.md"), blankDoc("아키텍처 개요", "프로젝트의 전체 구조와 의도를 기록합니다."));
  writeTextIfMissing(path.join(projectRoot, "architecture", "layers.md"), blankDoc("계층 구조", "계층과 의존 방향을 기록합니다."));
  writeTextIfMissing(path.join(projectRoot, "architecture", "module-boundaries.md"), blankDoc("모듈 경계", "모듈별 소유권과 경계 규칙을 기록합니다."));
  writeTextIfMissing(path.join(projectRoot, "architecture", "state.md"), blankDoc("상태 소유권", "클라이언트 상태, 서버 상태, cache, persistence 규칙을 기록합니다."));
  writeTextIfMissing(path.join(projectRoot, "architecture", "external-boundaries.md"), blankDoc("외부 경계", "DB, env, auth, storage, 외부 API 경계를 기록합니다."));

  writeTextIfMissing(path.join(projectRoot, "workflows", "README.md"), sectionReadme("작업 흐름", "로컬 실행, 명령, 검증, 배포 절차를 기록합니다."));
  writeTextIfMissing(path.join(projectRoot, "workflows", "local-dev.md"), blankDoc("로컬 개발", "로컬 실행과 환경 준비 절차를 기록합니다."));
  writeTextIfMissing(path.join(projectRoot, "workflows", "commands.md"), blankDoc("명령", "build, lint, typecheck, test 명령을 기록합니다."));
  writeTextIfMissing(path.join(projectRoot, "workflows", "test-and-quality.md"), blankDoc("검증 흐름", "작업 완료 전 확인해야 하는 검증 흐름을 기록합니다."));

  writeTextIfMissing(path.join(projectRoot, "graph", "README.md"), sectionReadme("프로젝트 그래프", "코드를 읽기 전 참고하는 구조 지도와 그래프 산출물을 관리합니다."));
}

async function main() {
  const workspaceRoot = fullPath(takeFlag("--workspace-root") || repoRoot);
  ensureDirectory("Workspace root", workspaceRoot);

  const devWikiRoot = path.join(workspaceRoot, ".codex", "dev-wiki");
  const configPath = path.join(devWikiRoot, "config.json");
  const existingConfig = (await readJsonIfExists(configPath)) || {};
  const project = takeFlag("--project") || existingConfig.project || readPackageName(workspaceRoot) || path.basename(workspaceRoot);
  const repo = takeFlag("--repo") || existingConfig.repo || DEFAULT_REPO;
  const branch = takeFlag("--branch") || existingConfig.branch || DEFAULT_BRANCH;
  const sourceRoot = path.join(devWikiRoot, "source");

  assertSafeProjectName(project);
  mkdirSync(devWikiRoot, { recursive: true });

  await upsertConfig(configPath, { repo, branch, project });
  writeTextIfMissing(
    path.join(devWikiRoot, "README.md"),
    [
      "# Dev Wiki Workspace",
      "",
      "This workspace has opted in to the shared dev wiki.",
      "",
      "- Config: `.codex/dev-wiki/config.json`",
      "- Source clone: `.codex/dev-wiki/source`",
      "- Project wiki root: `.codex/dev-wiki/source/{project}`",
      ""
    ].join("\n")
  );

  if (!existsSync(sourceRoot)) {
    runGit(["clone", "--branch", branch, repo, sourceRoot], workspaceRoot);
  }

  ensureGitRepo(sourceRoot);

  const remote = runGit(["remote", "get-url", "origin"], sourceRoot);
  if (normalizeRemote(remote) !== normalizeRemote(repo)) {
    throw new Error(`Dev wiki origin mismatch. Expected ${repo}, found ${remote}`);
  }

  bootstrapObsidian(sourceRoot);
  bootstrapSourceRoot(sourceRoot);
  await upsertProjectsIndex(path.join(sourceRoot, "_meta", "projects.json"), project);
  bootstrapProject(sourceRoot, project);

  const resolvedSourceRoot = await realpath(sourceRoot);
  const status = runGit(["status", "--short"], sourceRoot);

  console.log(`Prepared dev wiki source at ${resolvedSourceRoot}`);
  console.log(`Project wiki root: ${path.join(resolvedSourceRoot, project)}`);
  console.log(`Nested repo status:${status ? `\n${status}` : " clean"}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
