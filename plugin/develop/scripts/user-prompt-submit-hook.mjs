#!/usr/bin/env node

// UserPromptSubmit hook — runner entry point.
//
// Fires before Claude Code processes the user's prompt. When the user types
// `/runner <plan-path>` (the plugin's slash-command form), this hook owns the
// entire bootstrap of a runner session:
//
//   1. Locate the plan file from the prompt and validate that its frontmatter
//      has the three fields the runner depends on (plan_slug, branch,
//      owner_agent).
//   2. Verify the named owner_agent exists as `agents/<name>.md` in the
//      plugin so the dispatch later cannot silently pick a missing agent.
//   3. Derive the canonical plan-state path
//      (`plans/<stem>/.runner-state.json`) and either:
//        - create a brand-new state file in `validating`, or
//        - load the existing state and treat the request as a resume.
//   4. Detect worktree-path collisions with other in-flight plans so the user
//      is told before the runner skill blunders into them.
//   5. Register the state path in the session JSON so the Stop hook can find
//      it without globbing.
//   6. Emit `additionalContext` so the runner skill enters the conversation
//      already knowing which plan it is on, where the state lives, and
//      whether it is resuming or starting fresh.
//
// Anything that fails any of those checks blocks the prompt with a
// `decision: "block"` payload and a Korean reason, so the user sees the
// problem before it can affect a worktree or commit.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

import { absoluteNormalizePath, comparePaths, toPosixPath } from "./lib/fs.mjs";
import { addActivePlanState, listActivePlanStates } from "./lib/sessions.mjs";
import { extractRunnerHeaders, readPlanFrontmatter } from "./lib/plan-frontmatter.mjs";
import { recordHookEvent } from "./lib/telemetry.mjs";
import {
  STATUS,
  TERMINAL_STATUSES,
  createInitialState,
  deriveStatePathFromPlanPath,
  deriveWorktreePathFromBranch,
  saveState,
  tryLoadState,
} from "./lib/runner-state.mjs";
import { SESSION_ID_ENV } from "./lib/tracked-jobs.mjs";

const RUNNER_TRIGGER_RE = /^\s*\/runner(?:\s|$)/;

function readHookInput() {
  const raw = fs.readFileSync(0, "utf8").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (err) {
    process.stderr.write(`[user-prompt-hook] failed to parse stdin: ${err.message}\n`);
    return {};
  }
}

function emitContext(context) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: context,
      },
    }),
  );
}

function emitBlock(reason) {
  process.stdout.write(
    JSON.stringify({
      decision: "block",
      reason,
    }),
  );
}

// Pull the plan path from a prompt of the form `/runner <plan-path>` or
// `/runner   "<plan-path with spaces>"`. Anything beyond the first argument
// is ignored — the runner takes one plan per invocation.
function parsePlanPathArg(prompt) {
  const stripped = prompt.replace(RUNNER_TRIGGER_RE, "").trim();
  if (!stripped) return null;
  // Honour double or single quotes around the path.
  if (stripped.startsWith('"') || stripped.startsWith("'")) {
    const quote = stripped[0];
    const close = stripped.indexOf(quote, 1);
    if (close === -1) return stripped.slice(1).trim();
    return stripped.slice(1, close).trim();
  }
  // First whitespace-delimited token. The plan path is expected to live under
  // plans/, which never contains spaces in this project, so this is enough.
  const m = stripped.match(/^(\S+)/);
  return m ? m[1] : null;
}

// Resolve the plan path against the project cwd and verify it exists. Returns
// the absolute POSIX-form path on success, throws a user-facing error on miss.
function resolvePlanFile(rawPath, cwd) {
  const abs = path.isAbsolute(rawPath) ? rawPath : path.resolve(cwd, rawPath);
  const posix = toPosixPath(abs);
  if (!fs.existsSync(posix)) {
    throw new Error(
      `Plan 파일을 찾을 수 없습니다: ${rawPath}\n` +
      `(${posix}). cwd 또는 경로를 확인하세요.`,
    );
  }
  if (!posix.endsWith(".plan.md")) {
    throw new Error(
      `Plan 파일은 .plan.md 확장자여야 합니다: ${rawPath}`,
    );
  }
  return posix;
}

// Look up `agents/<name>.md` inside the plugin tree. CLAUDE_PLUGIN_ROOT is
// the canonical root that hooks.json launches us from; fall back to walking
// up from this script so the hook still works in unusual layouts.
function resolveAgentsDir() {
  const root = process.env.CLAUDE_PLUGIN_ROOT;
  if (root) return path.join(root, "agents");
  // Fallback: this file lives at <root>/scripts/user-prompt-submit-hook.mjs.
  return path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "agents");
}

function verifyOwnerAgentExists(ownerAgent) {
  const agentsDir = resolveAgentsDir();
  const candidate = path.join(agentsDir, `${ownerAgent}.md`);
  if (!fs.existsSync(candidate)) {
    throw new Error(
      `owner_agent "${ownerAgent}"에 해당하는 ${candidate} 파일이 없습니다.\n` +
      `agents/ 아래에 동일한 이름의 .md가 있는지 확인하세요.`,
    );
  }
}

// Determine the base branch to anchor the worktree on. We grab whatever HEAD
// points at right now, since `/runner` is meant to be invoked from the branch
// the user wants to merge back into. If the call fails (detached HEAD, bare
// directory) we fall back to "main" — the runner skill re-records the base in
// Step 2 anyway, so a wrong default here surfaces immediately, not silently.
function detectBaseBranch(cwd) {
  const r = spawnSync("git", ["-C", cwd, "rev-parse", "--abbrev-ref", "HEAD"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const out = String(r.stdout ?? "").trim();
  if (r.status === 0 && out && out !== "HEAD") {
    return out;
  }
  return "main";
}

// Build the additionalContext payload. The runner skill keys off the
// "[runner-skill bootstrap]" header line, then reads the structured fields
// underneath to decide which step to enter. Adding a new field here is safe;
// renaming an existing one is a coordinated change with the runner skill.
function buildBootstrapContext({
  planSlug,
  planPath,
  statePath,
  status,
  resume,
  state,
  worktreeExists,
}) {
  const lines = [
    "[runner-skill bootstrap]",
    `  plan_slug: ${planSlug}`,
    `  plan_path: ${planPath}`,
    `  state_path: ${statePath}`,
    `  status: ${status}`,
    `  resume: ${resume ? "true" : "false"}`,
  ];
  if (state?.worktree_path) {
    lines.push(`  worktree_path: ${state.worktree_path}`);
    lines.push(`  worktree_exists_on_disk: ${worktreeExists ? "true" : "false"}`);
  }
  if (state?.dev_review?.current_round) {
    lines.push(`  dev_review_round: ${state.dev_review.current_round}`);
  }
  if (state?.dev_review?.last_feedback_path) {
    lines.push(`  last_feedback_path: ${state.dev_review.last_feedback_path}`);
  }
  if (state?.stop_review?.block_history?.length) {
    const last = state.stop_review.block_history[state.stop_review.block_history.length - 1];
    if (last?.fingerprint && last.fingerprint !== "__allow__") {
      lines.push(`  last_block_count: ${last.count ?? 1}`);
      if (last.reason_excerpt) {
        lines.push(`  last_block_excerpt: ${last.reason_excerpt}`);
      }
    }
  }

  // Step guidance. Each status has one canonical action so the skill does
  // not need to reason about "what comes next" from scratch.
  const guidance = {
    [STATUS.VALIDATING]:
      "새 plan 진입입니다. SKILL.md의 Step 2(워크트리 준비)부터 시작하세요. " +
      "state_path의 JSON이 진행 상태의 단일 진실 원천이며, 모든 갱신은 runner-state 라이브러리 함수를 통해야 합니다.",
    [STATUS.DISPATCHING]:
      "이전 세션이 워크트리 준비 단계에서 멈췄습니다. state.worktree_path가 실제로 존재하는지 확인하고, 없다면 Step 2를 다시 진행해 worktree를 만든 뒤 Step 3로 이어가세요.",
    [STATUS.AWAITING_STOP_REVIEW]:
      "이전 턴이 stop-review 게이트 통과를 기다리는 상태로 끝났습니다. 워크트리에 새 commit이 없다면 빈 prompt로 턴을 종료해 게이트가 발동하도록 하고, 새 BLOCK 사유가 있다면 그에 맞춰 plan 에이전트를 재디스패치하세요.",
    [STATUS.STOP_REVIEW_BLOCKED]:
      "직전 stop-review가 BLOCK했습니다. last_block_excerpt와 state.stop_review.block_history를 확인해 사유를 파악한 뒤, plan 에이전트를 재디스패치하여 후속 commit을 만드세요.",
    [STATUS.AWAITING_DEV_REVIEW]:
      "stop-review를 통과했고 dev-review 단계로 들어갈 준비가 되었습니다. dev-review skill을 호출해 reviewer 피드백을 수집하세요.",
    [STATUS.REWORK_IN_PROGRESS]:
      "이전 dev-review 라운드에서 needs-change 항목이 있었습니다. last_feedback_path의 feedback.json을 읽고 각 rework_item별 Agent 디스패치를 이어 진행하세요.",
    [STATUS.QA_PENDING]:
      "이전 dev-review 라운드에서 reviewer가 question을 남겼습니다. 채팅에서 답변한 뒤 dev-review skill을 같은 round로 재진입하세요.",
    [STATUS.APPROVED]:
      "dev-review가 approved 상태입니다. 워크트리를 정리하고 사용자에게 병합/PR/나중에 옵션을 제시하세요.",
  };
  const note = guidance[status];
  if (note) {
    lines.push("", note);
  }
  return lines.join("\n");
}

async function main() {
  const input = readHookInput();
  const prompt = String(input.prompt ?? "");
  if (!RUNNER_TRIGGER_RE.test(prompt)) {
    // Not a /runner invocation — get out of the way silently.
    return;
  }

  const sessionId = input.session_id || process.env[SESSION_ID_ENV] || null;
  const cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();

  let planPath;
  let frontmatter;
  let statePath;
  let stateDir;
  let state = null;
  let resume = false;

  try {
    const rawArg = parsePlanPathArg(prompt);
    if (!rawArg) {
      throw new Error(
        "/runner 명령에 plan 파일 경로 인자가 없습니다.\n" +
        "예: /runner plans/login-frontend.plan.md",
      );
    }
    planPath = resolvePlanFile(rawArg, cwd);

    const fm = readPlanFrontmatter(planPath);
    frontmatter = extractRunnerHeaders(planPath, fm.headers);

    verifyOwnerAgentExists(frontmatter.ownerAgent);

    const derived = deriveStatePathFromPlanPath(planPath);
    statePath = derived.statePath;
    stateDir = derived.stateDir;

    const existing = tryLoadState(statePath);
    if (existing) {
      // Resume path. Reject only if the plan has already finished — every
      // other status is a legitimate place to pick the work back up from.
      if (TERMINAL_STATUSES.has(existing.status)) {
        throw new Error(
          `이 plan은 이미 "${existing.status}" 상태로 종료되었습니다.\n` +
          `state 파일: ${statePath}\n` +
          `다시 처음부터 실행하려면 위 파일과 워크트리(${existing.worktree_path})를 삭제한 뒤 /runner를 다시 실행하세요.`,
        );
      }
      // Sanity check: the plan file's frontmatter should still match the
      // identity recorded in state. Mismatches usually mean the user renamed
      // the slug or branch — surface it instead of silently overwriting.
      if (existing.plan_slug !== frontmatter.planSlug) {
        throw new Error(
          `plan_slug 불일치: state는 "${existing.plan_slug}", plan 파일은 "${frontmatter.planSlug}".\n` +
          `둘 중 어느 쪽을 정답으로 삼을지 결정한 뒤 다시 시도하세요.`,
        );
      }
      state = existing;
      resume = true;
    } else {
      // Fresh start. Verify no other live plan is using the same worktree
      // path before we commit to a state file.
      const wtPath = deriveWorktreePathFromBranch(cwd, frontmatter.branch);
      if (sessionId) {
        const otherPtrs = listActivePlanStates(sessionId).filter((p) => p !== statePath);
        for (const ptr of otherPtrs) {
          const ptrAbs = path.isAbsolute(ptr) ? ptr : path.resolve(cwd, ptr);
          const otherState = tryLoadState(ptrAbs);
          if (otherState && comparePaths(otherState.worktree_path, wtPath)) {
            throw new Error(
              `다른 진행 중인 plan(${otherState.plan_slug})이 같은 worktree 경로(${wtPath})를 사용 중입니다.\n` +
              `branch가 충돌합니다. 다른 branch로 plan frontmatter를 조정하거나 기존 plan을 정리한 뒤 다시 시도하세요.`,
            );
          }
        }
      }
      const baseBranch = detectBaseBranch(cwd);
      state = createInitialState({
        planSlug: frontmatter.planSlug,
        planPath,
        ownerAgent: frontmatter.ownerAgent,
        baseBranch,
        taskBranch: frontmatter.branch,
        worktreePath: wtPath,
        sessionId,
      });
      saveState(statePath, state);
    }

    if (sessionId) {
      addActivePlanState(sessionId, statePath);
    }

    const worktreeExists = state.worktree_path
      ? fs.existsSync(absoluteNormalizePath(state.worktree_path))
      : false;

    const context = buildBootstrapContext({
      planSlug: state.plan_slug,
      planPath,
      statePath,
      status: state.status,
      resume,
      state,
      worktreeExists,
    });

    recordHookEvent({
      kind: "runner_bootstrap",
      ok: true,
      sessionId,
      planSlug: state.plan_slug,
      status: state.status,
      resume,
    });

    emitContext(context);
  } catch (err) {
    recordHookEvent({
      kind: "runner_bootstrap",
      ok: false,
      sessionId,
      message: err?.message ?? String(err),
    });
    emitBlock(
      `[runner] /runner 진입을 차단했습니다.\n\n${err?.message ?? String(err)}`,
    );
  }
}

main();
