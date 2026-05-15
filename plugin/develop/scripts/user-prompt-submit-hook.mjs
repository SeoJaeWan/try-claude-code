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
//   2. Derive the canonical plan-state path
//      (`plans/<plan_key>/.runner-state.json`) and either:
//        - create a brand-new state file in `preparing`, or
//        - load the existing state and treat the request as a resume.
//   3. Update the session JSON's `activePlan` slot so the Stop hook (and any
//      future audit tooling) can see which plan this session is driving.
//   4. Emit `additionalContext` so the runner skill enters the conversation
//      already knowing which plan it is on, where the state lives, and
//      whether it is resuming or starting fresh.
//
// owner_agent file existence and sibling-plan path collisions used to be
// checked here but are now the runner skill's responsibility (Step 3 prose
// verifies the agent file before dispatch). The hook stays a thin bootstrap
// gate instead of a full validation funnel.
//
// Anything that fails any of these checks blocks the prompt with a
// `decision: "block"` payload and a Korean reason, so the user sees the
// problem before it can affect a worktree or commit.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

import { toPosixPath } from "./lib/fs.mjs";
import { setActivePlan } from "./lib/sessions.mjs";
import { extractRunnerHeaders, readPlanFrontmatter } from "./lib/plan-frontmatter.mjs";
import {
  TERMINAL_STATUSES,
  createInitialState,
  deriveStatePathFromPlanPath,
  deriveWorktreePathFromBranch,
  saveState,
  tryLoadState,
} from "./lib/runner-state.mjs";
import { readHookInput } from "./lib/hook-input.mjs";

const RUNNER_TRIGGER_RE = /^\s*\/runner(?:\s|$)/;

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
  // Two accepted shapes — `<name>.plan.md` (named plan) or `plan.md` inside a
  // named directory (the directory's canonical plan). Both map cleanly through
  // deriveStatePathFromPlanPath; anything else is rejected so the user notices
  // a typo here rather than at dispatch time.
  const basename = path.basename(posix);
  if (!posix.endsWith(".plan.md") && basename !== "plan.md") {
    throw new Error(
      `Plan 파일은 .plan.md 확장자이거나 폴더 안의 plan.md 여야 합니다: ${rawPath}`,
    );
  }
  return posix;
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

// Build the additionalContext payload. The skill keys off the
// "[runner-skill bootstrap]" header and then reads the JSON at `state_path`
// directly — every other field (status, worktree_path, dev_review round,
// block history) lives in that file and was previously duplicated into prose
// here. The duplication created a second string contract; the bootstrap is
// now reduced to two fields:
//
//   state_path  — absolute POSIX path to the canonical .runner-state.json
//   mode        — "fresh" for a brand-new plan, "resume" otherwise
//
// Per-status guidance is the runner SKILL.md's responsibility (its routing
// table reads `status` from the JSON). Anything that needs to grow lives in
// the JSON, not here.
function buildBootstrapContext({ statePath, resume }) {
  return [
    "[runner-skill bootstrap]",
    `  state_path: ${statePath}`,
    `  mode: ${resume ? "resume" : "fresh"}`,
  ].join("\n");
}

async function main() {
  const { prompt, sessionId, cwd } = readHookInput({ tag: "user-prompt-hook" });
  if (!RUNNER_TRIGGER_RE.test(prompt)) {
    // Not a /runner invocation — get out of the way silently.
    return;
  }

  let planPath;
  let frontmatter;
  let statePath;
  let state = null;
  let resume = false;

  try {
    const rawArg = parsePlanPathArg(prompt);
    if (!rawArg) {
      throw new Error(
        "/runner 명령에 plan 파일 경로 인자가 없습니다.\n" +
        "예: /runner plans/login-frontend.plan.md\n" +
        "    /runner plans/login-frontend/plan.md",
      );
    }
    planPath = resolvePlanFile(rawArg, cwd);

    const fm = readPlanFrontmatter(planPath);
    frontmatter = extractRunnerHeaders(planPath, fm.headers);

    const derived = deriveStatePathFromPlanPath(planPath);
    statePath = derived.statePath;

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
      // Fresh start. We previously enforced a "one /runner per terminal"
      // rule here by scanning the session's activePlanStates list and
      // rejecting if another non-terminal plan was registered. That rule
      // exists to prevent the Stop hook from surfacing only the first BLOCK
      // when multiple armed plans collide on the same turn-end, but the
      // enforcement was costing more (confused users, manual session
      // resets) than the UX hazard it prevented. The session slot is now
      // informational — setActivePlan overwrites and warns to stderr.
      const wtPath = deriveWorktreePathFromBranch(cwd, frontmatter.branch);
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
      setActivePlan(sessionId, statePath);
    }

    const context = buildBootstrapContext({ statePath, resume });
    emitContext(context);
  } catch (err) {
    emitBlock(
      `[runner] /runner 진입을 차단했습니다.\n\n${err?.message ?? String(err)}`,
    );
  }
}

main();
