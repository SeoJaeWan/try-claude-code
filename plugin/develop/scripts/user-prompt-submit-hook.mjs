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
//      (`plans/<plan_key>/.runner-state.json`) and either:
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

import { toPosixPath } from "./lib/fs.mjs";
import { addActivePlanState, listActivePlanStates } from "./lib/sessions.mjs";
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
  // Plan authors may write `owner_agent` either bare (`frontend-developer`)
  // or plugin-namespaced (`try-claude-code:frontend-developer`). Claude Code
  // emits the namespaced form when dispatching plugin agents, and `agents/`
  // on disk only stores the bare form (one file per agent in this plugin).
  // Strip any `<plugin>:` prefix before the filesystem lookup so both inputs
  // resolve to the same file — and importantly, so `:` does not leak into a
  // path on Windows, where it is an invalid filename character.
  const bareName = ownerAgent.includes(":")
    ? ownerAgent.slice(ownerAgent.indexOf(":") + 1)
    : ownerAgent;
  const candidate = path.join(agentsDir, `${bareName}.md`);
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
  let stateDir;
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

    verifyOwnerAgentExists(frontmatter.ownerAgent);

    const derived = deriveStatePathFromPlanPath(planPath);
    statePath = derived.statePath;
    stateDir = derived.stateDir;

    // Collision: `plans/foo.plan.md` and `plans/foo/plan.md` both map to the
    // same `plans/foo/.runner-state.json`. Either alone is fine; together they
    // would silently share state. Refuse loudly so the user renames one before
    // anything else touches disk.
    const planDir = path.dirname(planPath);
    const planBase = path.basename(planPath);
    let siblingPlanPath = null;
    if (planBase === "plan.md") {
      const candidate = `${planDir}.plan.md`;
      if (fs.existsSync(candidate)) siblingPlanPath = candidate;
    } else if (planBase.endsWith(".plan.md")) {
      const stem = planBase.slice(0, -".plan.md".length);
      const candidate = path.join(planDir, stem, "plan.md");
      if (fs.existsSync(candidate)) siblingPlanPath = candidate;
    }
    if (siblingPlanPath) {
      throw new Error(
        `Plan 경로 충돌: 다음 두 파일이 같은 state 위치(${statePath})를 공유합니다.\n` +
        `  - ${planPath}\n` +
        `  - ${siblingPlanPath}\n` +
        `한 plan_key당 plan 파일은 하나여야 합니다. 둘 중 하나를 다른 이름으로 옮긴 뒤 다시 실행하세요.`,
      );
    }

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
      // Fresh start. Two collision checks against other plans in this
      // session — both reject before we touch disk:
      //   (1) Single-active-plan rule. A session that already drives a
      //       non-terminal plan should not pick up a second one — the runner
      //       prose says "one /runner per terminal" but nothing else enforces
      //       it, and overlapping armed plans cause the Stop hook to surface
      //       only the first BLOCK while the rest are written silently.
      //   (2) Worktree path collision. Even with rule (1) satisfied (e.g.
      //       state pointers pruned but we are paranoid), refuse if the new
      //       plan would share a worktree directory with an existing one.
      const wtPath = deriveWorktreePathFromBranch(cwd, frontmatter.branch);
      if (sessionId) {
        const otherPtrs = listActivePlanStates(sessionId).filter((p) => p !== statePath);
        for (const ptr of otherPtrs) {
          const ptrAbs = path.isAbsolute(ptr) ? ptr : path.resolve(cwd, ptr);
          const otherState = tryLoadState(ptrAbs);
          if (!otherState) continue;
          if (TERMINAL_STATUSES.has(otherState.status)) continue;
          // (1) Any other non-terminal plan is enough to reject.
          throw new Error(
            `이 세션에 이미 진행 중인 plan(${otherState.plan_slug}, status="${otherState.status}")이 있습니다.\n` +
            `state: ${ptrAbs}\n` +
            `먼저 그 plan을 마무리하거나, 새 터미널에서 /runner를 실행하세요.\n` +
            `한 세션 = 한 plan 규칙은 stop-review BLOCK이 다른 plan에 묻히는 것을 막기 위한 것입니다.`,
          );
          // (2) (unreachable while (1) rejects, kept for future relaxation:
          //     if comparePaths(otherState.worktree_path, wtPath) ...)
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

    const context = buildBootstrapContext({ statePath, resume });
    emitContext(context);
  } catch (err) {
    emitBlock(
      `[runner] /runner 진입을 차단했습니다.\n\n${err?.message ?? String(err)}`,
    );
  }
}

main();
