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
//             waiting for review, but allow the call.
//   - block → emit `{"decision":"block","reason":...}` so Claude Code
//             refuses the call and surfaces the Korean reason.
//
// Anything that fails inside this hook (parse error, missing session, throw)
// must default to allow — a hook crash should never paralyze the user.
//
// Phase 2 reshape: the hook used to mutate plan-state as a side effect of
// the "auto-arm" path — seeing the plan-agent dispatch would atomically
// walk `preparing → dispatching/armed` and save the state file. That has
// been removed. Status transitions are now driven exclusively by explicit
// `runner-state-cli.mjs arm-for-dispatch` calls from the runner skill, so
// every state change shows up in the turn log. The hook is pure judgment
// again: read state, ask policy, emit decision.

import process from "node:process";

import { readHookInput } from "./lib/hook-input.mjs";
import { listActivePlanStates } from "./lib/sessions.mjs";
import {
  TERMINAL_STATUSES,
  deriveStatePathFromPlanPath,
  tryLoadState,
} from "./lib/runner-state.mjs";
import { evaluate, VERDICT } from "./lib/pre-tool-use-policy.mjs";

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
  try {
    const { raw, sessionId } = readHookInput({ tag: "pre-tool-use-hook" });
    const toolName = typeof raw.tool_name === "string" ? raw.tool_name : null;
    const toolInput = (raw.tool_input && typeof raw.tool_input === "object") ? raw.tool_input : {};

    if (!toolName) {
      // Nothing to gate.
      return;
    }

    const state = resolveActivePlanState(sessionId);
    const verdict = evaluate({
      state,
      toolName,
      toolInput,
      planAreas: state ? planAreasFor(state) : [],
    });

    if (verdict.decision === VERDICT.BLOCK) {
      emitBlock(verdict.reason);
      return;
    }
    if (verdict.decision === VERDICT.WARN) {
      emitWarn(verdict.reason);
      return;
    }
    // allow → silent.
  } catch {
    // Fail open. A hook crash must not block the user's workflow.
  }
}

main();
