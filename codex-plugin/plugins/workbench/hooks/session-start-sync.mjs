#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const GIT_TIMEOUT_MS = 20_000;

async function readHookInput() {
  let raw = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) raw += chunk;
  if (!raw.trim()) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function runGit(sourceRoot, args) {
  return spawnSync("git", ["-C", sourceRoot, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: "0"
    },
    stdio: ["ignore", "pipe", "pipe"],
    timeout: GIT_TIMEOUT_MS,
    windowsHide: true
  });
}

function verifyRepository(sourceRoot) {
  const result = runGit(sourceRoot, ["rev-parse", "--show-toplevel"]);
  if (result.error || result.status !== 0) return false;

  try {
    return realpathSync(result.stdout.trim()) === realpathSync(sourceRoot);
  } catch {
    return false;
  }
}

function updateRepository(label, sourceRoot) {
  if (!existsSync(sourceRoot)) return null;

  try {
    if (!lstatSync(sourceRoot).isDirectory()) {
      return `${label}: source 경로가 디렉터리가 아니어서 최신화를 건너뛰었습니다.`;
    }
  } catch {
    return `${label}: source 경로를 확인할 수 없어 최신화를 건너뛰었습니다.`;
  }

  if (!verifyRepository(sourceRoot)) {
    return `${label}: source 경로가 Git 저장소 루트가 아니어서 최신화를 건너뛰었습니다.`;
  }

  const result = runGit(sourceRoot, [
    "-c",
    "credential.interactive=never",
    "-c",
    "pull.rebase=false",
    "pull",
    "--ff-only",
    "--quiet"
  ]);

  if (!result.error && result.status === 0) return null;
  if (result.error?.code === "ETIMEDOUT") {
    return `${label}: Git 최신화 시간이 초과되어 기존 상태를 유지했습니다.`;
  }

  return `${label}: fast-forward 최신화에 실패하여 기존 작업 트리와 브랜치를 유지했습니다.`;
}

const payload = await readHookInput();
if (payload === null) process.exit(0);
if (payload.hook_event_name && payload.hook_event_name !== "SessionStart") process.exit(0);

const codexHome = path.resolve(process.env.CODEX_HOME || path.join(os.homedir(), ".codex"));
const llmScriptRoot = path.resolve(
  process.env.LLM_SCRIPT_ROOT || path.join(codexHome, "workbench", "llm-script")
);
const targets = [
  ["LLM Script", path.join(llmScriptRoot, "source")],
  ["Dev Wiki", path.join(codexHome, "workbench", "dev-wiki", "source")]
];

const warnings = targets
  .map(([label, sourceRoot]) => updateRepository(label, sourceRoot))
  .filter(Boolean);

if (warnings.length > 0) {
  process.stdout.write(JSON.stringify({
    systemMessage: `Workbench 세션 시작 최신화 경고:\n${warnings.join("\n")}`
  }));
}
