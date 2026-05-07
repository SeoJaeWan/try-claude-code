// PreToolUse policy — decides whether a main-session tool call is allowed
// while a runner plan is mid-flight.
//
// The runner skill is prose Claude reads each turn (SKILL.md). Hard guarantees
// only exist where hooks intercept the tool boundary. This module owns the
// matrix of "given the active plan's status, which tools may the main session
// call?" and is invoked by `pre-tool-use-hook.mjs`.
//
// Core idea: every tool call goes through one of three verdicts:
//   - "allow"  — call is consistent with the current status, proceed silently.
//   - "warn"   — call is suspicious but not destructive (e.g. editing an
//                unrelated file mid-review). The hook surfaces a systemMessage
//                but does not block.
//   - "block"  — call would violate the runner's invariants (e.g. directly
//                editing the worktree while waiting for dev-review). The hook
//                emits `decision: "block"` with the returned reason.
//
// This module is pure: no fs, no env, no spawn. The hook resolves the active
// plan-state and current tool input, then asks `evaluate({...})` for a
// verdict. That separation keeps the matrix unit-testable across every
// (status, tool, command-shape, cwd) combination without spawning a hook.
//
// Status semantics, summarized so the matrix below makes sense without
// re-reading SKILL.md every time:
//
//   validating          — fresh plan; worktree may not exist yet. Skill is in
//                         Step 2. Main session may run read-only Bash and the
//                         runner-state-cli; everything else waits for Step 3
//                         to arm and dispatch.
//   dispatching         — Step 2 finished, gate not yet armed. Same posture as
//                         validating: read-only inspection is fine, mutating
//                         work belongs to the dispatched agent.
//   awaiting_stop_review — gate armed, main session is *about* to dispatch the
//                         plan agent (Agent call) or has just dispatched it and
//                         is waiting for the Stop hook to score the diff. The
//                         Agent call itself is the only legitimate dispatch
//                         here; rework dispatches happen at a different status.
//   stop_review_blocked  — Stop hook returned BLOCK. Skill must re-dispatch the
//                         plan agent (same Agent call) so it commits a fix.
//   awaiting_dev_review  — Stop-review passed; the user is reviewing in the
//                         dev-review browser. Main session must not edit the
//                         worktree on its own — rework lives behind the
//                         `begin-rework` CLI + Agent dispatch path.
//   rework_in_progress   — `begin-rework` CLI was called; one or more rework
//                         Agent dispatches are running. Same posture: main
//                         session does not directly edit; the rework agent
//                         does.
//   qa_pending           — Reviewer asked questions. Main session answers in
//                         chat (no tool calls needed) and runs the
//                         `qa-resolved` CLI when done.
//   approved             — Dev-review accepted. Step 5 prose has the main
//                         session run `git worktree remove`, `git merge`,
//                         `git branch -d`, and the `mark-merged` / `reset`
//                         CLIs. Mutating Bash is *expected* here.
//   merged               — Terminal. UserPromptSubmit refuses re-entry, so
//                         this is mostly defensive — treat as no-active-plan.
//
// The matrix below encodes those rules. Edit the matrix, not callers.

import path from "node:path";

import { TERMINAL_STATUSES } from "./runner-state-machine.mjs";

// Tools that can mutate the filesystem. The hook also screens Bash separately
// because Bash sees both read-only inspection and mutating commands, so its
// row needs the command-shape sub-classifier below.
const MUTATING_FILE_TOOLS = new Set(["Edit", "Write", "NotebookEdit"]);

// Bash commands the runner skill needs every turn — read-only inspection and
// the runner-state CLI itself. Anything matching these patterns is "safe"
// regardless of status; everything else is "mutating" and gated by status.
//
// Patterns are intentionally broad: false positives (treating something safe
// as mutating) annoy but recover with a re-try; false negatives (treating
// something mutating as safe) silently bypass the gate. Lean strict.
const SAFE_BASH_PATTERNS = [
  // runner-state-cli invocations — every status transition the skill makes
  // routes through this CLI, so the hook must never block it.
  /\brunner-state-cli\.mjs\b/,
  // Read-only git inspection.
  /^\s*git\s+(rev-parse|log|status|diff|show|worktree\s+list|branch\s*$|branch\s+--list|branch\s+-l|config\s+--get)\b/,
  // POSIX read-only filesystem inspection.
  /^\s*(ls|cat|head|tail|wc|file|find\s+\S+\s+-type\b|test\s+-[defsr])\b/,
  /^\s*\[\s+-[defsr]\s+/, // [ -d <path> ], etc.
  // Node test runners and similar read-mostly invocations the skill may
  // surface for diagnostics. Matching `node --test` and `node -e "..."` would
  // be too broad — those are not gated here, see the Bash mutating list.
  /^\s*pnpm\s+(exec|test|run\s+test)\b/,
];

// Bash commands that mutate enough to matter. We only need a list strict
// enough to catch the mistakes the runner is meant to prevent (manual git
// commits, branch deletions, worktree edits, etc.); anything ambiguous falls
// through to the catch-all "mutating" classification at the end of
// `classifyBashCommand`.
const MUTATING_BASH_PATTERNS = [
  /^\s*git\s+(commit|push|merge|reset|checkout|switch|rebase|cherry-pick|revert|tag|am|apply|stash\s+(?!list|show))/,
  /^\s*git\s+branch\s+(-d|-D|--delete)/,
  /^\s*git\s+worktree\s+(add|remove|move|prune)/,
  /^\s*git\s+(add|rm|mv|restore)/,
  /^\s*(rm|mv|cp)\s/,
  /^\s*echo\b.*>>?\s*\S/,
  /^\s*(printf|tee)\b/,
  /(^|\s|;|&&|\|\|)\s*\>\s*\S/,
];

export const VERDICT = Object.freeze({
  ALLOW: "allow",
  WARN: "warn",
  BLOCK: "block",
});

// Classify a Bash command into one of three buckets the matrix can switch on.
//   "safe"          — never blocked.
//   "mutating"      — gated by status.
//   "ambiguous"     — anything we cannot classify; gated as "mutating" by the
//                     matrix to err on the safe side, but tests can assert the
//                     classifier separately.
export function classifyBashCommand(command) {
  if (typeof command !== "string" || !command.trim()) return "safe";
  for (const re of SAFE_BASH_PATTERNS) {
    if (re.test(command)) return "safe";
  }
  for (const re of MUTATING_BASH_PATTERNS) {
    if (re.test(command)) return "mutating";
  }
  return "ambiguous";
}

// Some tool calls operate on a path argument (Edit/Write/NotebookEdit's
// `file_path`, certain Bash commands). When the path is fully outside the
// active plan's worktree directory and outside the plan-state directory, the
// matrix downgrades a block to a warn — the user is allowed to do unrelated
// work in the repo while a plan waits for review, but the runner still notes
// the active plan in case they forgot.
function isPathInsideAny(p, dirs) {
  if (typeof p !== "string" || !p) return false;
  const abs = path.isAbsolute(p) ? p : null;
  if (!abs) return false; // relative paths are ambiguous; treat as inside.
  for (const dir of dirs) {
    if (!dir) continue;
    const rel = path.relative(dir, abs);
    if (rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))) {
      return true;
    }
  }
  return false;
}

// Does this tool input target a path that lies within the active plan's
// worktree or plan-state directory? Used to scope the warn vs block downgrade.
function toolTargetsPlanArea(toolName, toolInput, planAreas) {
  if (!planAreas?.length) return true; // unknown areas → assume yes (strict).
  if (MUTATING_FILE_TOOLS.has(toolName)) {
    const fp = toolInput?.file_path ?? toolInput?.path ?? toolInput?.notebook_path;
    return isPathInsideAny(fp, planAreas);
  }
  if (toolName === "Bash") {
    const cwd = toolInput?.cwd;
    // If cwd is set and lies inside the plan area, treat as targeting it.
    if (typeof cwd === "string" && isPathInsideAny(cwd, planAreas)) return true;
    // Otherwise scan the command for any absolute path within the plan area.
    const cmd = typeof toolInput?.command === "string" ? toolInput.command : "";
    for (const dir of planAreas) {
      if (!dir) continue;
      if (cmd.includes(dir)) return true;
    }
    return false;
  }
  // Conservative default for unknown tools.
  return true;
}

// Does this Agent / Task dispatch correspond to the active plan's owner_agent
// and worktree? When yes, the call is part of the runner pipeline and is
// allowed (subject to status). When no, it's an unrelated Agent call the user
// or skill made for some other reason — the matrix lets it through.
function dispatchMatchesPlan(toolInput, state) {
  if (!state) return false;
  const subagent = toolInput?.subagent_type;
  if (typeof subagent !== "string") return false;
  // owner_agent is the plan-agent for the main dispatch; rework agents are
  // selected per-item by the reviewer and may differ. We cannot know the
  // rework choice from policy alone, so we accept any subagent_type when
  // status is rework_in_progress and rely on the prose to pick correctly.
  if (subagent === state.owner_agent) return true;
  return false;
}

// Per-status disposition for each tool family. `allow`, `warn`, `block` are
// the three terminal verdicts; functions defer the choice to runtime context
// (e.g. classifying the Bash command, checking dispatch identity).
const MATRIX = {
  validating: {
    bashSafe: VERDICT.ALLOW,
    bashMutating: VERDICT.BLOCK,
    fileMutating: VERDICT.BLOCK,
    agentDispatch: VERDICT.BLOCK,
  },
  dispatching: {
    bashSafe: VERDICT.ALLOW,
    bashMutating: VERDICT.BLOCK,
    fileMutating: VERDICT.BLOCK,
    agentDispatch: VERDICT.BLOCK,
  },
  awaiting_stop_review: {
    bashSafe: VERDICT.ALLOW,
    bashMutating: VERDICT.BLOCK,
    fileMutating: VERDICT.BLOCK,
    agentDispatch: ({ matchesPlan }) =>
      matchesPlan ? VERDICT.ALLOW : VERDICT.BLOCK,
  },
  stop_review_blocked: {
    bashSafe: VERDICT.ALLOW,
    bashMutating: VERDICT.BLOCK,
    fileMutating: VERDICT.BLOCK,
    agentDispatch: ({ matchesPlan }) =>
      matchesPlan ? VERDICT.ALLOW : VERDICT.BLOCK,
  },
  awaiting_dev_review: {
    bashSafe: VERDICT.ALLOW,
    bashMutating: VERDICT.BLOCK,
    fileMutating: VERDICT.BLOCK,
    agentDispatch: VERDICT.BLOCK,
  },
  rework_in_progress: {
    bashSafe: VERDICT.ALLOW,
    bashMutating: VERDICT.BLOCK,
    fileMutating: VERDICT.BLOCK,
    // Rework dispatches use a per-item agent the reviewer chose, which we
    // cannot validate from policy. Allow any Agent call here and rely on
    // SKILL.md prose to dispatch only the reviewer's selection.
    agentDispatch: VERDICT.ALLOW,
  },
  qa_pending: {
    bashSafe: VERDICT.ALLOW,
    bashMutating: VERDICT.BLOCK,
    fileMutating: VERDICT.BLOCK,
    agentDispatch: VERDICT.BLOCK,
  },
  approved: {
    bashSafe: VERDICT.ALLOW,
    // Step 5 explicitly runs git merge / branch -d / worktree remove from the
    // main session. Allow mutating Bash here so the prose can do its job.
    bashMutating: VERDICT.ALLOW,
    fileMutating: VERDICT.WARN,
    agentDispatch: VERDICT.WARN,
  },
};

// Build a Korean reason string. Kept inline so test diffs are readable; the
// runner audience reads Korean and the format roughly mirrors the
// UserPromptSubmit hook's existing block reasons.
function reasonFor({ status, planSlug, statePath, hint }) {
  const head = `[runner] 활성 plan(${planSlug}, status="${status}") 보호 중입니다.`;
  const body = hint || "현재 상태에서는 허용되지 않은 도구 호출입니다.";
  const tail =
    `state: ${statePath}\n` +
    `필요하면 runner skill 안내에 따라 다음 단계로 진행하세요. 한 세션 = 한 plan 규칙은 ` +
    `메인 세션이 worktree를 직접 수정해 dev-review와 어긋나는 것을 막기 위한 것입니다.`;
  return `${head}\n${body}\n${tail}`;
}

// Resolve a matrix cell to a final verdict, calling the function form if any.
function resolveCell(cell, ctx) {
  if (typeof cell === "function") return cell(ctx);
  return cell;
}

// Main entry. `state` is the active plan-state (already filtered to the one
// non-terminal pointer for this session) or null. `toolName` and `toolInput`
// come straight from the PreToolUse payload. `planAreas` is a list of
// absolute directories the matrix considers "plan-owned" — typically the
// worktree path and the plans/{plan_key}/ directory.
//
// Returns { decision: VERDICT.*, reason: string|null }.
export function evaluate({ state, toolName, toolInput, planAreas }) {
  if (!state || TERMINAL_STATUSES.has(state.status)) {
    return { decision: VERDICT.ALLOW, reason: null };
  }
  const row = MATRIX[state.status];
  if (!row) {
    // Unknown status — fail open. A stricter posture would block, but blocking
    // every tool call when a future status is added is worse than letting it
    // through; adding the status to MATRIX surfaces in tests.
    return { decision: VERDICT.ALLOW, reason: null };
  }

  const ctx = {
    state,
    toolInput,
    matchesPlan: false,
  };

  let cell;
  let hint;

  if (toolName === "Bash") {
    const klass = classifyBashCommand(toolInput?.command);
    if (klass === "safe") {
      cell = row.bashSafe;
    } else {
      cell = row.bashMutating;
      hint =
        `Bash 명령이 worktree 또는 git 상태를 변경할 수 있습니다 ` +
        `(\`${(toolInput?.command ?? "").slice(0, 80)}\`). ` +
        `runner skill 단계가 아직 이 단계에 오지 않았습니다.`;
    }
  } else if (MUTATING_FILE_TOOLS.has(toolName)) {
    cell = row.fileMutating;
    if (!toolTargetsPlanArea(toolName, toolInput, planAreas)) {
      // Outside the plan area — downgrade block to warn.
      if (cell === VERDICT.BLOCK) cell = VERDICT.WARN;
    }
    hint =
      `메인 세션은 ${state.status} 상태에서 worktree를 직접 수정할 수 없습니다. ` +
      `해당 작업은 dispatch된 agent가 담당합니다.`;
  } else if (toolName === "Task" || toolName === "Agent") {
    ctx.matchesPlan = dispatchMatchesPlan(toolInput, state);
    cell = row.agentDispatch;
    if (!ctx.matchesPlan && cell === VERDICT.BLOCK) {
      hint =
        `Agent 호출이 활성 plan의 owner_agent(${state.owner_agent})와 일치하지 않습니다. ` +
        `현재 status에서는 plan dispatch 외 Agent 호출을 차단합니다.`;
    }
  } else {
    // Tools we don't gate (Read, Glob, Grep, AskUserQuestion, etc.).
    return { decision: VERDICT.ALLOW, reason: null };
  }

  const verdict = resolveCell(cell, ctx);
  if (verdict === VERDICT.ALLOW) {
    return { decision: VERDICT.ALLOW, reason: null };
  }
  return {
    decision: verdict,
    reason: reasonFor({
      status: state.status,
      planSlug: state.plan_slug,
      statePath: state.__statePath ?? "(state path unknown)",
      hint,
    }),
  };
}
