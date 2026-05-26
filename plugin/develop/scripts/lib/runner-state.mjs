// Plan-state container for the runner skill.
//
// Every plan that the runner executes owns one JSON file at
// `plans/{plan_key}/.runner-state.json`. The runner skill itself derives
// that path and writes the initial record in its Step 1; this module only
// provides the persistence + `dev_review.phase` mutation surface that
// runner-state-cli.mjs and dev-review/scripts/generate-review-data.mjs
// share.
//
// State shape:
//
//   {
//     plan_slug, plan_path, owner_agent,
//     task_branch, worktree_path, base_branch,
//     dev_review: { phase, last_feedback_path }
//   }
//
// `dev_review.phase` is one of `"awaiting" | "rework" | "qa" | null`. The
// dev-review skill reads this file via the `state_path` it receives from
// the runner skill, so the field shape is part of the dev-review contract
// — do not rename or move fields without coordinating with that skill.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { toPosixPath } from "./fs.mjs";

// dev_review.phase values. The only remaining sub-state in the slim schema.
export const DEV_REVIEW_PHASE = Object.freeze({
  AWAITING: "awaiting",
  REWORK: "rework",
  QA: "qa",
});
const DEV_REVIEW_PHASE_VALUES = new Set(Object.values(DEV_REVIEW_PHASE));

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

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
