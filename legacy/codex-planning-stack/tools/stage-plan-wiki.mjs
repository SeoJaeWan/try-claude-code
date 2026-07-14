#!/usr/bin/env node

/**
 * 프로젝트 로컬 plan wiki source clone을 준비하고 구조를 검증하는 CLI 스크립트.
 *
 * 기본 경로는 `./.codex/plan-wiki/source`이며, planning agent는
 * 이 clone 안의 `wiki/` 디렉터리를 planning root로 사용한다.
 */

import { spawnSync } from "node:child_process";
import { existsSync, lstatSync } from "node:fs";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const argv = process.argv.slice(2);

/**
 * CLI 인자 목록에서 값이 필요한 flag의 값을 읽는다.
 *
 * @param {string} name 찾을 flag 이름. 예: `--source-root`.
 * @returns {string | null} flag 다음 값이 있으면 그 값, 없으면 `null`.
 */
function takeFlag(name) {
  const idx = argv.indexOf(name);
  if (idx < 0) return null;
  const value = argv[idx + 1];
  if (!value || value.startsWith("--")) return null;
  return value;
}

/**
 * CLI 인자 목록에 boolean flag가 있는지 확인한다.
 *
 * @param {string} name 찾을 flag 이름.
 * @returns {boolean} flag가 존재하면 `true`.
 */
function hasFlag(name) {
  return argv.includes(name);
}

if (hasFlag("--help") || hasFlag("-h")) {
  console.log("Usage: node .codex/tools/stage-plan-wiki.mjs [--workspace-root <path>] [--source-root <path>] [--repo <git-url>] [--branch <name>]");
  console.log("");
  console.log("Prepares ./.codex/plan-wiki/source as the project-local clone of the shared plan wiki Git repository.");
  console.log("Planning agents read ./.codex/plan-wiki/source/wiki directly; no sync/current link is created.");
  process.exit(0);
}

/**
 * 입력 경로를 현재 프로세스 기준 절대 경로로 변환한다.
 *
 * @param {string} value 상대 또는 절대 경로.
 * @returns {string} 정규화된 절대 경로.
 */
function fullPath(value) {
  return path.resolve(value);
}

/**
 * workspace의 plan wiki 설정 파일을 읽는다.
 *
 * 설정 파일이 없으면 빈 설정을 반환해 CLI flag나 환경변수만으로도 실행할 수 있게 한다.
 *
 * @param {string} workspaceRoot workspace root 절대 경로.
 * @returns {Promise<Record<string, unknown>>} `repo`, `branch` 등을 담은 설정 객체.
 * @throws {Error} JSON이 깨졌거나 파일을 읽을 수 없는 경우.
 */
async function readConfig(workspaceRoot) {
  const configPath = path.join(workspaceRoot, ".codex", "plan-wiki", "config.json");
  try {
    const raw = await readFile(configPath, "utf8");
    return JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw new Error(`Invalid plan wiki config at ${configPath}: ${error.message}`);
  }
}

/**
 * Git 명령을 동기 실행하고 표준 출력을 문자열로 반환한다.
 *
 * @param {string[]} args `git` 뒤에 붙일 인자 배열.
 * @param {string} cwd 명령을 실행할 작업 디렉터리.
 * @returns {string} trim 처리된 표준 출력.
 * @throws {Error} Git 명령이 실패한 경우 stderr/stdout을 포함한 오류.
 */
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

/**
 * 특정 경로가 실제 디렉터리인지 검증한다.
 *
 * @param {string} label 오류 메시지에 사용할 사람이 읽는 이름.
 * @param {string} value 확인할 경로.
 * @throws {Error} 경로가 없거나 디렉터리가 아닌 경우.
 */
function ensureDirectory(label, value) {
  if (!existsSync(value) || !lstatSync(value).isDirectory()) {
    throw new Error(`${label} not found: ${value}`);
  }
}

/**
 * plan wiki source root가 Git worktree인지 확인한다.
 *
 * @param {string} sourceRoot plan wiki source clone 경로.
 * @throws {Error} source root가 없거나 Git worktree가 아닌 경우.
 */
function ensureGitRepo(sourceRoot) {
  ensureDirectory("Plan wiki source root", sourceRoot);
  runGit(["rev-parse", "--is-inside-work-tree"], sourceRoot);
}

/**
 * planning agent가 요구하는 plan wiki 필수 파일과 디렉터리를 확인한다.
 *
 * @param {string} sourceRoot plan wiki source clone 경로.
 * @throws {Error} 필수 구조가 빠져 있는 경우.
 */
function verifyPlanWiki(sourceRoot) {
  const required = [
    "wiki/registry.json",
    "wiki/core",
    "wiki/patterns",
    "wiki/generated",
    "wiki/_meta",
    "raw",
    "feedback",
    "history"
  ];

  for (const relativePath of required) {
    const target = path.join(sourceRoot, relativePath);
    if (!existsSync(target)) {
      throw new Error(`Plan wiki source is missing ${relativePath}: ${target}`);
    }
  }
}

/**
 * CLI 진입점.
 *
 * 설정, 환경변수, CLI flag를 합쳐 source clone을 준비하고 remote와 구조를 검증한다.
 *
 * @returns {Promise<void>}
 */
async function main() {
  const workspaceRoot = fullPath(takeFlag("--workspace-root") || repoRoot);
  ensureDirectory("Workspace root", workspaceRoot);

  const config = await readConfig(workspaceRoot);
  const sourceRoot = fullPath(
    takeFlag("--source-root") ||
      process.env.PLAN_WIKI_SOURCE_ROOT ||
      path.join(workspaceRoot, ".codex", "plan-wiki", "source")
  );
  const repo = takeFlag("--repo") || process.env.PLAN_WIKI_REPO || config.repo;
  const branch = takeFlag("--branch") || process.env.PLAN_WIKI_BRANCH || config.branch || "main";

  if (!existsSync(sourceRoot)) {
    if (!repo) {
      throw new Error("Plan wiki source is missing and no repo is configured. Set .codex/plan-wiki/config.json repo or pass --repo.");
    }
    runGit(["clone", "--branch", branch, repo, sourceRoot], workspaceRoot);
  }

  ensureGitRepo(sourceRoot);

  if (repo) {
    const remote = runGit(["remote", "get-url", "origin"], sourceRoot);
    if (remote !== repo) {
      throw new Error(`Plan wiki origin mismatch. Expected ${repo}, found ${remote}`);
    }
  }

  verifyPlanWiki(sourceRoot);

  const resolvedSourceRoot = await realpath(sourceRoot);
  console.log(`Prepared plan wiki source at ${resolvedSourceRoot}`);
  console.log(`Planning root: ${path.join(resolvedSourceRoot, "wiki")}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
