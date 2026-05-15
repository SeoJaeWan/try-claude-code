// Plan-state SSOT for the runner skill.
//
// Every plan that the runner executes owns one JSON file at
// `plans/{plan_key}/.runner-state.json` — where `plan_key` is the plan
// directory's relative path under `plans/`, slashes preserved (so a nested
// plan at `plans/auth/login.plan.md` has `plan_key=auth/login`). A bare
// `plans/auth/plan.md` collapses to `plan_key=auth` — the directory itself
// IS the plan key when its file is named `plan.md` (Next-style convention).
// That file is the single source of
// truth for everything the runner, the UserPromptSubmit hook, and the Stop
// hook need to know about the plan: which worktree it lives in, what status
// it is at, whether the stop-review gate is armed, how the dev-review loop is
// progressing, and the BLOCK history accumulated by stop-review.
//
// Why a JSON file (and not session memory or a regex contract):
//   - It survives session restarts and machine reboots, so resuming a paused
//     plan only requires the user to type the same `/runner <plan>` again.
//   - It is plain JSON the user can open and inspect, which makes the runner's
//     internal state debuggable instead of opaque.
//   - It removes the brittle `description` / `prompt` regex contract between
//     the runner skill and the hooks. Hooks read structured fields.
//
// This module owns reading, writing, and transitioning that file. All callers
// (runner skill via Bash CLI, UserPromptSubmit hook, Stop hook, dev-review
// skill) must go through these helpers so writes stay atomic and transitions
// stay valid. Direct fs.writeFileSync on a state file is a bug.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { absoluteNormalizePath, toPosixPath } from "./fs.mjs";
import {
  ALLOWED_DEV_REVIEW_PHASE_TRANSITIONS,
  ALLOWED_STOP_REVIEW_PHASE_TRANSITIONS,
  ALLOWED_TRANSITIONS,
  DEV_REVIEW_PHASE,
  DEV_REVIEW_PHASE_VALUES,
  SCHEMA_VERSION,
  STATUS,
  STATUS_VALUES,
  STOP_REVIEW_PHASE,
  STOP_REVIEW_PHASE_VALUES,
  TERMINAL_STATUSES,
} from "./runner-state-machine.mjs";

// Re-export the state-machine contract so existing callers
// (`from "./lib/runner-state.mjs"`) keep working unchanged.
export {
  DEV_REVIEW_PHASE,
  SCHEMA_VERSION,
  STATUS,
  STATUS_VALUES,
  STOP_REVIEW_PHASE,
  TERMINAL_STATUSES,
};

function nowIso() {
  return new Date().toISOString();
}

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
//
// Both `plans/foo.plan.md` and `plans/foo/plan.md` map to the same
// `plans/foo/.runner-state.json`. That collision is rare in practice but
// silently overwriting one with the other would be confusing — callers that
// know both files might exist (UserPromptSubmit hook) are expected to flag it
// before reaching this function.
//
// The plan_slug field inside the state is used for commit messages and
// identification, but the on-disk state location is keyed off the plan file
// path.
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
// `worktrees/{branch with / replaced by -}`. Skill, hooks, and tests all rely
// on this exact rule, so do not parameterize it without updating callers.
export function deriveWorktreePathFromBranch(repoRoot, taskBranch) {
  const safe = String(taskBranch).replace(/\//g, "-");
  return toPosixPath(path.join(repoRoot, "worktrees", safe));
}

// ---------------------------------------------------------------------------
// State factory + validation
// ---------------------------------------------------------------------------

// Build the initial in-memory shape for a brand-new plan. Persistence happens
// via saveState; this function never touches disk.
export function createInitialState({
  planSlug,
  planPath,
  ownerAgent,
  baseBranch,
  taskBranch,
  worktreePath,
  sessionId = null,
}) {
  if (!planSlug) throw new Error("createInitialState: planSlug is required");
  if (!planPath) throw new Error("createInitialState: planPath is required");
  if (!ownerAgent) throw new Error("createInitialState: ownerAgent is required");
  if (!baseBranch) throw new Error("createInitialState: baseBranch is required");
  if (!taskBranch) throw new Error("createInitialState: taskBranch is required");
  if (!worktreePath) throw new Error("createInitialState: worktreePath is required");

  const now = nowIso();
  return {
    schema_version: SCHEMA_VERSION,
    plan_slug: planSlug,
    plan_path: toPosixPath(planPath),
    owner_agent: ownerAgent,
    base_branch: baseBranch,
    task_branch: taskBranch,
    worktree_path: toPosixPath(worktreePath),
    status: STATUS.PREPARING,
    stop_review: {
      armed: false,
      phase: null,
      last_result: null,
      last_reviewed_commit: null,
      block_history: [],
    },
    dev_review: {
      phase: null,
      last_feedback_path: null,
    },
    session_id: sessionId,
    created_at: now,
    updated_at: now,
  };
}

// Sanity-check a parsed state object. Returns the (mutated) state on success,
// throws a descriptive error on failure. Callers that load state from disk
// rely on this so bad files surface immediately rather than poisoning later
// transitions.
//
// schema_version=1 (the pre-Phase-4 9-status enum) is no longer auto-migrated.
// State files written before the runner-hook-cleanup landed must be deleted
// and re-created via `/runner` — the migration path was removed because every
// active user had already moved past it, and keeping the v1 mapping table
// alive forever cost more than the rare re-init.
export function validateState(state) {
  if (!state || typeof state !== "object") {
    throw new Error("plan-state: not an object");
  }
  if (state.schema_version !== SCHEMA_VERSION) {
    if (state.schema_version === 1) {
      throw new Error(
        `이 plan-state 파일은 schema_version=1 (v1) 입니다. 자동 마이그레이션은 ` +
        `제거되었습니다. 해당 plan을 처음부터 다시 실행하려면 state 파일을 ` +
        `삭제한 뒤 \`/runner\`를 다시 호출하세요. ` +
        `(현재 runner는 schema_version=${SCHEMA_VERSION}을 사용합니다.)`,
      );
    }
    throw new Error(
      `plan-state: unsupported schema_version ${state.schema_version} ` +
      `(this runner expects ${SCHEMA_VERSION}). Delete the state file and ` +
      `re-run /runner to regenerate.`,
    );
  }
  for (const field of [
    "plan_slug",
    "plan_path",
    "owner_agent",
    "base_branch",
    "task_branch",
    "worktree_path",
    "status",
  ]) {
    if (!state[field]) {
      throw new Error(`plan-state: missing required field "${field}"`);
    }
  }
  if (!STATUS_VALUES.has(state.status)) {
    throw new Error(`plan-state: unknown status "${state.status}"`);
  }
  if (!state.stop_review || typeof state.stop_review !== "object") {
    throw new Error("plan-state: stop_review block is missing");
  }
  if (!state.dev_review || typeof state.dev_review !== "object") {
    throw new Error("plan-state: dev_review block is missing");
  }
  // Phase fields are optional for legacy fixtures that predate Phase 4 but
  // when present must be a known value (or null).
  if (
    state.stop_review.phase !== undefined &&
    state.stop_review.phase !== null &&
    !STOP_REVIEW_PHASE_VALUES.has(state.stop_review.phase)
  ) {
    throw new Error(
      `plan-state: unknown stop_review.phase "${state.stop_review.phase}"`,
    );
  }
  if (
    state.dev_review.phase !== undefined &&
    state.dev_review.phase !== null &&
    !DEV_REVIEW_PHASE_VALUES.has(state.dev_review.phase)
  ) {
    throw new Error(
      `plan-state: unknown dev_review.phase "${state.dev_review.phase}"`,
    );
  }
  if (!Array.isArray(state.stop_review.block_history)) {
    throw new Error("plan-state: stop_review.block_history must be an array");
  }
  return state;
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
  return validateState(parsed);
}

export function tryLoadState(statePath) {
  if (!fs.existsSync(statePath)) return null;
  return loadState(statePath);
}

// Atomic write: serialize, write to a sibling tempfile, then rename onto the
// target. rename is atomic on both POSIX and Windows when source and target
// live on the same volume, which is always the case here because we put the
// tempfile in the same directory.
export function saveState(statePath, state) {
  validateState(state);
  state.updated_at = nowIso();

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
// Transitions
// ---------------------------------------------------------------------------

// Defensive precondition for runner skill steps. The skill is prose Claude
// reads each turn, so there is no compile-time guarantee that it enters a
// step with the status the prose assumed. Calling this at the top of each
// branch turns "wrong status, silently does the wrong thing" into "wrong
// status, throws with a useful message" — which the caller surfaces to the
// user instead of corrupting state.
//
// Pass an array when more than one status is acceptable (e.g. dev-review
// re-entry tolerates both AWAITING_DEV_REVIEW and QA_PENDING).
export function assertExpectedStatus(state, expected, context = "") {
  const accepted = new Set(Array.isArray(expected) ? expected : [expected]);
  for (const value of accepted) {
    if (!STATUS_VALUES.has(value)) {
      throw new Error(
        `assertExpectedStatus: unknown expected status "${value}"`,
      );
    }
  }
  if (!accepted.has(state.status)) {
    const where = context ? ` (${context})` : "";
    throw new Error(
      `assertExpectedStatus: state.status is "${state.status}", expected ` +
      `${[...accepted].map((v) => `"${v}"`).join(" or ")}${where}. ` +
      "The runner skill drove this step from the wrong status — fix the skill " +
      "or use transitionStatus to move state into the expected status before retrying.",
    );
  }
  return state;
}

// Move state.status to a new value if the transition is allowed. Returns the
// updated state (never a copy — caller is expected to saveState afterwards).
// Throws on illegal transitions to make accidental misuse loud.
export function transitionStatus(state, nextStatus) {
  if (!STATUS_VALUES.has(nextStatus)) {
    throw new Error(`transitionStatus: unknown status "${nextStatus}"`);
  }
  const allowed = ALLOWED_TRANSITIONS.get(state.status);
  if (!allowed || !allowed.has(nextStatus)) {
    throw new Error(
      `transitionStatus: ${state.status} → ${nextStatus} is not allowed.`,
    );
  }
  state.status = nextStatus;
  return state;
}

// Stop-review armed flag toggle. Kept on its own because the Stop hook flips
// it from inside a non-runner-skill turn, and the runner skill flips it back
// in the next plan dispatch.
export function setStopReviewArmed(state, armed) {
  state.stop_review.armed = Boolean(armed);
  return state;
}

// Phase setters. These validate the move against the per-block phase tables
// in runner-state-machine.mjs. Passing `null` returns the state to "no phase"
// (used when the status leaves the block — e.g. after `mark-approved`
// clears `dev_review.phase` because the status is now CLOSING).
export function setStopReviewPhase(state, nextPhase) {
  if (nextPhase !== null && !STOP_REVIEW_PHASE_VALUES.has(nextPhase)) {
    throw new Error(`setStopReviewPhase: unknown phase "${nextPhase}"`);
  }
  const current = state.stop_review.phase ?? null;
  // null is reachable from any phase (the status is leaving DISPATCHING and
  // the phase no longer applies). We do not validate that direction.
  if (nextPhase !== null) {
    const allowed = ALLOWED_STOP_REVIEW_PHASE_TRANSITIONS.get(current);
    if (!allowed || !allowed.has(nextPhase)) {
      throw new Error(
        `setStopReviewPhase: ${current ?? "null"} → ${nextPhase} is not allowed.`,
      );
    }
  }
  state.stop_review.phase = nextPhase;
  return state;
}

export function setDevReviewPhase(state, nextPhase) {
  if (nextPhase !== null && !DEV_REVIEW_PHASE_VALUES.has(nextPhase)) {
    throw new Error(`setDevReviewPhase: unknown phase "${nextPhase}"`);
  }
  const current = state.dev_review.phase ?? null;
  if (nextPhase !== null) {
    const allowed = ALLOWED_DEV_REVIEW_PHASE_TRANSITIONS.get(current);
    if (!allowed || !allowed.has(nextPhase)) {
      throw new Error(
        `setDevReviewPhase: ${current ?? "null"} → ${nextPhase} is not allowed.`,
      );
    }
  }
  state.dev_review.phase = nextPhase;
  return state;
}

// Record that a stop-review pass has happened on a given HEAD. Saves the SHA
// so the next pass can diff incrementally instead of replaying every commit.
export function setLastReviewedCommit(state, headSha, result) {
  state.stop_review.last_reviewed_commit = headSha || null;
  if (result) {
    state.stop_review.last_result = result;
  }
  return state;
}

// Human-readable excerpt for the block_history entry. Pulled from the first
// non-empty line of the reason, capped so block_history stays browsable when
// the user opens the JSON. Hooks store this so a later glance at the file is
// enough to diagnose what blocked.
function excerptBlockReason(reason) {
  const text = String(reason ?? "");
  const firstLine = text.split(/\r?\n/).map((l) => l.trim()).find(Boolean) || "";
  const MAX = 240;
  return firstLine.length > MAX ? `${firstLine.slice(0, MAX - 1)}…` : firstLine;
}

// Append a BLOCK record on the plan-state. Each BLOCK is its own entry —
// there is no longer a fingerprint/count coalescing step or a 3-strike
// escalation downstream. The history is capped so the file does not grow
// unbounded across long-running plans.
export function recordPlanBlock(state, reason) {
  const excerpt = excerptBlockReason(reason);
  const history = state.stop_review.block_history;
  history.push({
    at: nowIso(),
    reason_excerpt: excerpt,
  });
  if (history.length > 10) {
    state.stop_review.block_history = history.slice(-10);
  }
  return state;
}

// Record the absolute path to the latest dev-review feedback.json. Called by
// `begin-rework` so the runner skill can find the file when dispatching rework
// agents. Round numbers are no longer tracked — feedback files are named by
// timestamp so each round has its own artifact without an explicit counter.
export function setDevReviewFeedbackPath(state, feedbackPath) {
  state.dev_review.last_feedback_path = feedbackPath
    ? toPosixPath(feedbackPath)
    : null;
  return state;
}
