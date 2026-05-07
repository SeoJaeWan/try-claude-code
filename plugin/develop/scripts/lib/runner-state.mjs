// Plan-state SSOT for the runner skill.
//
// Every plan that the runner executes owns one JSON file at
// `plans/{plan_stem}/.runner-state.json`. That file is the single source of
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
  ALLOWED_TRANSITIONS,
  SCHEMA_VERSION,
  STATUS,
  STATUS_VALUES,
  TERMINAL_STATUSES,
} from "./runner-state-machine.mjs";

// Re-export the state-machine contract so existing callers
// (`from "./lib/runner-state.mjs"`) keep working unchanged.
export { SCHEMA_VERSION, STATUS, TERMINAL_STATUSES };

function nowIso() {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Path derivation
// ---------------------------------------------------------------------------

// Given a plan file path like `plans/login-frontend.plan.md`, return the
// directory the runner uses for that plan's artifacts (`plans/login-frontend/`)
// and the canonical state file path inside it.
//
// The state path mirrors the plan file's own location so that nested plan
// directories (e.g. `plans/auth/login.plan.md`) don't collide on a shared
// `plans/{slug}/` namespace. The plan_slug field inside the state is used for
// commit messages and identification, but the on-disk state location is keyed
// off the plan file path.
export function deriveStatePathFromPlanPath(planPath) {
  const abs = absoluteNormalizePath(planPath);
  const dir = path.dirname(abs);
  const base = path.basename(abs);
  const stem = base.endsWith(".plan.md")
    ? base.slice(0, -".plan.md".length)
    : base.replace(/\.md$/i, "");
  if (!stem) {
    throw new Error(
      `Cannot derive plan-state path from plan path: "${planPath}". The file ` +
      `must end in .plan.md so the runner knows where to put state.`,
    );
  }
  const stateDir = toPosixPath(path.join(dir, stem));
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
    status: STATUS.VALIDATING,
    stop_review: {
      armed: false,
      last_result: null,
      last_reviewed_commit: null,
      block_history: [],
    },
    dev_review: {
      current_round: 0,
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
export function validateState(state) {
  if (!state || typeof state !== "object") {
    throw new Error("plan-state: not an object");
  }
  if (state.schema_version !== SCHEMA_VERSION) {
    throw new Error(
      `plan-state: unsupported schema_version ${state.schema_version} ` +
      `(this runner expects ${SCHEMA_VERSION}). Delete and re-run /runner ` +
      `to regenerate, or migrate manually.`,
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
  const raw = fs.readFileSync(statePath, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `plan-state: failed to parse JSON at ${statePath}: ${err.message}`,
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

// Record that a stop-review pass has happened on a given HEAD. Saves the SHA
// so the next pass can diff incrementally instead of replaying every commit.
export function setLastReviewedCommit(state, headSha, result) {
  state.stop_review.last_reviewed_commit = headSha || null;
  if (result) {
    state.stop_review.last_result = result;
  }
  return state;
}

// Compute a stable fingerprint for a BLOCK reason so repeated identical BLOCKs
// can be coalesced into a single block_history entry with a count. Mirrors the
// previous behaviour of sessions.recordBlock so the escalation threshold (3
// repeats triggers a human-intervention note) keeps working unchanged.
export function fingerprintBlockReason(reason) {
  const normalized = String(reason ?? "")
    .replace(/\r?\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16);
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

// Append (or coalesce) a BLOCK record on the plan-state. Returns
// { fingerprint, count } so the caller can decide whether to escalate.
export function recordPlanBlock(state, reason) {
  const fingerprint = fingerprintBlockReason(reason);
  const excerpt = excerptBlockReason(reason);
  const history = state.stop_review.block_history;
  const last = history[history.length - 1];
  const now = nowIso();
  if (last && last.fingerprint === fingerprint) {
    last.count = (last.count || 1) + 1;
    last.last_at = now;
    if (excerpt) last.reason_excerpt = excerpt;
  } else {
    history.push({
      fingerprint,
      count: 1,
      first_at: now,
      last_at: now,
      reason_excerpt: excerpt,
    });
  }
  // Cap so the file does not grow unbounded across long-running plans.
  if (history.length > 10) {
    state.stop_review.block_history = history.slice(-10);
  }
  const tail = state.stop_review.block_history[state.stop_review.block_history.length - 1];
  return { fingerprint: tail.fingerprint, count: tail.count };
}

// Called when the stop-gate returns ALLOW (or is skipped). Appends a synthetic
// "__allow__" separator so the next consecutive BLOCK starts a fresh streak —
// equivalent to the previous sessions.clearRecentBlockStreak behaviour.
export function clearPlanBlockStreak(state) {
  const history = state.stop_review.block_history;
  if (!Array.isArray(history) || history.length === 0) return state;
  const last = history[history.length - 1];
  if (last && last.fingerprint !== "__allow__") {
    const now = nowIso();
    history.push({
      fingerprint: "__allow__",
      count: 1,
      first_at: now,
      last_at: now,
      reason_excerpt: null,
    });
    if (history.length > 10) {
      state.stop_review.block_history = history.slice(-10);
    }
  }
  return state;
}

// Dev-review round bookkeeping. Round numbers start at 1 for the first review
// pass; the runner skill increments via this helper before invoking dev-review
// so the round visible to the user matches the round persisted to state.
export function bumpDevReviewRound(state, feedbackPath = null) {
  state.dev_review.current_round = (state.dev_review.current_round || 0) + 1;
  if (feedbackPath !== undefined) {
    state.dev_review.last_feedback_path = feedbackPath
      ? toPosixPath(feedbackPath)
      : null;
  }
  return state;
}
