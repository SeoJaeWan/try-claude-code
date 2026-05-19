// Plan-state container for the runner skill.
//
// Every plan that the runner executes owns one JSON file at
// `plans/{plan_key}/.runner-state.json` — where `plan_key` is the plan
// directory's relative path under `plans/`, slashes preserved (so a nested
// plan at `plans/auth/login.plan.md` has `plan_key=auth/login`). A bare
// `plans/auth/plan.md` collapses to `plan_key=auth`.
//
// The runner skill itself infers what Step it is on from disk (worktree
// presence, commits in the task branch, feedback.json on disk). This module
// only stores the identity bits and the dev-review sub-state that disk
// inspection alone cannot disambiguate:
//
//   {
//     plan_slug, plan_path, owner_agent,
//     task_branch, worktree_path, base_branch,
//     dev_review: { phase, last_feedback_path }
//   }
//
// `dev_review.phase` is one of `"awaiting" | "rework" | "qa" | null`. The
// dev-review skill reads this file via the `state_path` it receives from the
// runner skill, so the field shape is part of the dev-review contract — do
// not rename or move fields without coordinating with that skill.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { absoluteNormalizePath, toPosixPath } from "./fs.mjs";

// dev_review.phase values. Inlined here after runner-state-machine.mjs was
// absorbed — the only remaining sub-state in the slim schema.
export const DEV_REVIEW_PHASE = Object.freeze({
  AWAITING: "awaiting",
  REWORK: "rework",
  QA: "qa",
});
const DEV_REVIEW_PHASE_VALUES = new Set(Object.values(DEV_REVIEW_PHASE));

// ---------------------------------------------------------------------------
// Path derivation
// ---------------------------------------------------------------------------

// Given a plan file path, return the directory the runner uses for that plan's
// artifacts and the canonical state file path inside it. Three shapes accepted,
// in order of preference:
//
//   1. `<dir>/plan.md` — the file is the directory's canonical plan. stateDir
//      is `<dir>` itself; stem is `<dir>`'s basename. So
//      `plans/auth/plan.md` → `plans/auth/.runner-state.json` (plan_key=auth).
//   2. `<dir>/<name>.plan.md` — named plan. Strip the `.plan.md` suffix to get
//      the stem, then nest under it. So
//      `plans/auth/login.plan.md` → `plans/auth/login/.runner-state.json`
//      (plan_key=auth/login).
//   3. `<dir>/<name>.md` — legacy fallback (e.g. notes.md). Strip just `.md`.
export function deriveStatePathFromPlanPath(planPath) {
  const abs = absoluteNormalizePath(planPath);
  const dir = path.dirname(abs);
  const base = path.basename(abs);

  let stateDir;
  let stem;
  if (base === "plan.md") {
    stateDir = toPosixPath(dir);
    stem = path.basename(dir);
  } else if (base.endsWith(".plan.md")) {
    stem = base.slice(0, -".plan.md".length);
    stateDir = toPosixPath(path.join(dir, stem));
  } else {
    stem = base.replace(/\.md$/i, "");
    stateDir = toPosixPath(path.join(dir, stem));
  }
  if (!stem) {
    throw new Error(
      `Cannot derive plan-state path from plan path: "${planPath}". The file ` +
      `must end in .plan.md, or be named plan.md inside a named directory, ` +
      `so the runner knows where to put state.`,
    );
  }
  const statePath = toPosixPath(path.join(stateDir, ".runner-state.json"));
  return { stateDir, statePath, stem };
}

// Map a task branch to the on-disk worktree path the runner uses. Convention:
// `worktrees/{branch with / replaced by -}`.
export function deriveWorktreePathFromBranch(repoRoot, taskBranch) {
  const safe = String(taskBranch).replace(/\//g, "-");
  return toPosixPath(path.join(repoRoot, "worktrees", safe));
}

// ---------------------------------------------------------------------------
// State factory
// ---------------------------------------------------------------------------

export function createInitialState({
  planSlug,
  planPath,
  ownerAgent,
  baseBranch,
  taskBranch,
  worktreePath,
}) {
  if (!planSlug) throw new Error("createInitialState: planSlug is required");
  if (!planPath) throw new Error("createInitialState: planPath is required");
  if (!ownerAgent) throw new Error("createInitialState: ownerAgent is required");
  if (!baseBranch) throw new Error("createInitialState: baseBranch is required");
  if (!taskBranch) throw new Error("createInitialState: taskBranch is required");
  if (!worktreePath) throw new Error("createInitialState: worktreePath is required");

  return {
    plan_slug: planSlug,
    plan_path: toPosixPath(planPath),
    owner_agent: ownerAgent,
    base_branch: baseBranch,
    task_branch: taskBranch,
    worktree_path: toPosixPath(worktreePath),
    dev_review: {
      phase: null,
      last_feedback_path: null,
    },
  };
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export function stateFileExists(statePath) {
  return fs.existsSync(statePath);
}

export function loadState(statePath) {
  let raw;
  try {
    raw = fs.readFileSync(statePath, "utf8");
  } catch (err) {
    throw new Error(
      `plan-state: failed to read ${statePath}: ${err.message}`,
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (parseErr) {
    throw new Error(
      `plan-state: failed to parse JSON at ${statePath}: ${parseErr.message}`,
    );
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`plan-state: ${statePath} did not parse to an object`);
  }
  return parsed;
}

export function tryLoadState(statePath) {
  if (!fs.existsSync(statePath)) return null;
  return loadState(statePath);
}

// Atomic write via sibling tempfile + rename. rename is atomic on both POSIX
// and Windows when source and target live on the same volume.
export function saveState(statePath, state) {
  const dir = path.dirname(statePath);
  fs.mkdirSync(dir, { recursive: true });

  const tmp = path.join(
    dir,
    `.runner-state.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`,
  );
  const body = `${JSON.stringify(state, null, 2)}\n`;
  fs.writeFileSync(tmp, body, "utf8");
  try {
    fs.renameSync(tmp, statePath);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch { /* best-effort cleanup */ }
    throw err;
  }
  return state;
}

// ---------------------------------------------------------------------------
// dev_review.phase mutators
// ---------------------------------------------------------------------------

export function setDevReviewPhase(state, nextPhase) {
  if (nextPhase !== null && !DEV_REVIEW_PHASE_VALUES.has(nextPhase)) {
    throw new Error(`setDevReviewPhase: unknown phase "${nextPhase}"`);
  }
  state.dev_review.phase = nextPhase;
  return state;
}

export function setDevReviewFeedbackPath(state, feedbackPath) {
  state.dev_review.last_feedback_path = feedbackPath
    ? toPosixPath(feedbackPath)
    : null;
  return state;
}
