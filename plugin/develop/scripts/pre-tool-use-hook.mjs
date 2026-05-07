#!/usr/bin/env node

// PreToolUse hook — runner-aware tool gate.
//
// Fires before Claude Code dispatches *any* tool call. When a runner plan is
// mid-flight in this session (the UserPromptSubmit hook registered a non-
// terminal plan-state pointer in `session.activePlanStates`), this hook asks
// `lib/pre-tool-use-policy.mjs` whether the tool call is consistent with the
// plan's current status:
//
//   - allow → exit silently. Claude Code proceeds with the call.
//   - warn  → print a systemMessage so the user is reminded the plan is still
//             waiting for review, but allow the call. Used for unrelated
//             edits during long review pauses.
//   - block → emit `{"decision":"block","reason":...}` so Claude Code
//             refuses the call and surfaces the Korean reason.
//
// Anything that fails inside this hook (parse error, missing session, throw)
// must default to allow — a hook crash should never paralyze the user.
//
// Why a hook, not prose:
//   The runner SKILL.md is prose Claude reads each turn. It tells the model
//   "do not edit the worktree directly during dev-review". That works most
//   of the time. This hook turns that instruction into a hard guarantee at
//   the tool boundary, so the runner's mental model and the actual diff
//   the reviewer sees cannot drift.

import path from "node:path";
import process from "node:process";

import { readHookInput } from "./lib/hook-input.mjs";
import { listActivePlanStates } from "./lib/sessions.mjs";
import {
  STATUS,
  TERMINAL_STATUSES,
  deriveStatePathFromPlanPath,
  saveState,
  setStopReviewArmed,
  transitionStatus,
  tryLoadState,
} from "./lib/runner-state.mjs";
import { evaluate, VERDICT } from "./lib/pre-tool-use-policy.mjs";
import { recordHookEvent } from "./lib/telemetry.mjs";

// Statuses from which a fresh plan-agent dispatch can legitimately arm the
// stop-review gate. Mirrors the `arm-for-dispatch` CLI subcommand so the
// runner skill prose no longer needs to call the CLI by hand — the hook arms
// the gate as a side-effect of seeing the dispatch.
const ARM_FROM_STATUSES = new Set([
  STATUS.VALIDATING,
  STATUS.DISPATCHING,
  STATUS.STOP_REVIEW_BLOCKED,
]);

function emitBlock(reason) {
  process.stdout.write(JSON.stringify({ decision: "block", reason }));
}

function emitWarn(message) {
  // PreToolUse permits a `systemMessage` payload for non-blocking notes; this
  // is the same shape Claude Code surfaces back to the user. Allow proceeds.
  process.stdout.write(JSON.stringify({ systemMessage: message }));
}

// Resolve the active plan-state for this session: pick the first non-terminal
// pointer. UserPromptSubmit's single-active-plan rule guarantees there is at
// most one, but if multiple exist we still want a deterministic choice.
function resolveActivePlanState(sessionId) {
  if (!sessionId) return null;
  const ptrs = listActivePlanStates(sessionId);
  for (const ptr of ptrs) {
    const state = tryLoadState(ptr);
    if (!state) continue;
    if (TERMINAL_STATUSES.has(state.status)) continue;
    // Decorate with the path so reasons can mention it without re-reading.
    state.__statePath = ptr;
    return state;
  }
  return null;
}

// Auto-arm the stop-review gate when the main session is about to dispatch
// the plan agent for this plan. Returns the (possibly updated) state. The
// transitions mirror cmdArmForDispatch in runner-state-cli.mjs:
//
//   validating          → dispatching → awaiting_stop_review
//   dispatching         →                awaiting_stop_review
//   stop_review_blocked →                awaiting_stop_review
//
// Only fires when the dispatch's `subagent_type` matches `state.owner_agent`,
// so unrelated Agent calls (Explore, etc.) do not advance the gate. Idempotent
// on the armed flag: re-running on an already-armed state is a no-op.
function maybeAutoArm(state, toolName, toolInput) {
  if (toolName !== "Task" && toolName !== "Agent") return state;
  if (!state || !state.__statePath) return state;
  if (!ARM_FROM_STATUSES.has(state.status)) return state;
  const subagent = toolInput?.subagent_type;
  if (typeof subagent !== "string" || subagent !== state.owner_agent) {
    return state;
  }
  const before = state.status;
  if (state.status === STATUS.VALIDATING) {
    transitionStatus(state, STATUS.DISPATCHING);
  }
  if (state.status !== STATUS.AWAITING_STOP_REVIEW) {
    transitionStatus(state, STATUS.AWAITING_STOP_REVIEW);
  }
  setStopReviewArmed(state, true);
  saveState(state.__statePath, state);
  recordHookEvent({
    kind: "pre_tool_use_auto_arm",
    ok: true,
    sessionId: state.session_id ?? null,
    planSlug: state.plan_slug,
    from: before,
    to: state.status,
  });
  return state;
}

// Build the list of "plan-owned" directories for the warn-vs-block downgrade.
// The worktree path is mandatory; we also include the plan-state directory so
// edits to .runner-state.json or feedback*.json count as plan-area edits.
function planAreasFor(state) {
  const areas = [];
  if (typeof state.worktree_path === "string" && state.worktree_path) {
    areas.push(state.worktree_path);
  }
  if (typeof state.plan_path === "string" && state.plan_path) {
    try {
      const { stateDir } = deriveStatePathFromPlanPath(state.plan_path);
      areas.push(stateDir);
    } catch {
      // ignore — best-effort.
    }
  }
  return areas;
}

async function main() {
  let toolName = null;
  let toolInput = null;
  let sessionId = null;
  try {
    const { raw, sessionId: sid } = readHookInput({ tag: "pre-tool-use-hook" });
    sessionId = sid;
    toolName = typeof raw.tool_name === "string" ? raw.tool_name : null;
    toolInput = (raw.tool_input && typeof raw.tool_input === "object") ? raw.tool_input : {};

    if (!toolName) {
      // Nothing to gate.
      return;
    }

    let state = resolveActivePlanState(sessionId);
    state = maybeAutoArm(state, toolName, toolInput);
    const verdict = evaluate({
      state,
      toolName,
      toolInput,
      planAreas: state ? planAreasFor(state) : [],
    });

    if (verdict.decision === VERDICT.BLOCK) {
      emitBlock(verdict.reason);
      recordHookEvent({
        kind: "pre_tool_use_block",
        ok: true,
        sessionId,
        toolName,
        status: state?.status ?? null,
      });
      return;
    }
    if (verdict.decision === VERDICT.WARN) {
      emitWarn(verdict.reason);
      recordHookEvent({
        kind: "pre_tool_use_warn",
        ok: true,
        sessionId,
        toolName,
        status: state?.status ?? null,
      });
      return;
    }
    // allow → silent.
  } catch (err) {
    // Fail open. A hook crash must not block the user's workflow.
    recordHookEvent({
      kind: "pre_tool_use_error",
      ok: false,
      sessionId,
      toolName,
      message: err?.message ?? String(err),
    });
  }
}

main();
