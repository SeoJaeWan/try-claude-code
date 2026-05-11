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
// Status semantics (v2, 5-status enum), summarized so the matrix below makes
// sense without re-reading SKILL.md every time. Sub-states (rework/qa/awaiting
// inside dev-review, armed/blocked/passed inside stop-review) live on
// `state.{stop_review,dev_review}.phase` and only matter for the agent-
// dispatch resolver.
//
//   preparing      — fresh plan; worktree may not exist yet. Step 1-2.
//                    Main session legitimately runs `git worktree add` here
//                    to create the worktree directory the plan agent will
//                    inhabit (runner/SKILL.md Core rule 3 + Step 2), and may
//                    run `git worktree remove --force` on Step 2's stale-wipe
//                    path. Both are narrowed by `isWorktreeBootstrapCommand`
//                    so the command must touch `state.worktree_path` —
//                    arbitrary worktree mutations are still BLOCKed. All
//                    *other* mutations (commits, edits inside the worktree)
//                    wait for Step 3's plan-agent dispatch; the worktree's
//                    interior is the agent's domain. PreToolUse auto-arms
//                    the gate when it sees the matching Agent dispatch from
//                    this status.
//   dispatching    — Step 3. `stop_review.phase` distinguishes "armed" (gate
//                    primed) from "blocked" (Stop hook reported BLOCK,
//                    awaiting re-dispatch) from "passed" (transient pre-flip
//                    to dev_reviewing). Plan-agent dispatch is the only
//                    legitimate Agent call here.
//   dev_reviewing  — Step 4. `dev_review.phase` distinguishes "awaiting" /
//                    "rework" / "qa". Main session does not edit the worktree
//                    directly — rework happens through the `begin-rework`
//                    CLI + Agent dispatch path; phase=rework is the only
//                    sub-state where Agent dispatches are allowed.
//   closing        — Step 5: dev-review approved. Main session runs git
//                    merge / branch -d / worktree remove. Mutating Bash is
//                    *expected* here; Edit/Write on the (now-removed)
//                    worktree is unusual but downgraded to warn.
//   merged         — Terminal. UserPromptSubmit refuses re-entry, so this
//                    is mostly defensive — treat as no-active-plan.
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

// Step 2 worktree bootstrap commands. The main session legitimately runs
// `git worktree add` to create the plan's worktree directory (runner/SKILL.md
// Core rule 3 + Step 2) and `git worktree remove --force` to wipe a stale
// worktree before recreating it. The `preparing` matrix row routes its
// `bashMutating` cell through this helper so only these two narrow shapes
// pass — anything else mutating in `preparing` stays BLOCKed.
//
// Why not add these to SAFE_BASH_PATTERNS:
//   `classifyBashCommand` returns the same verdict for every status. We only
//   want this carve-out during `preparing` — once the plan reaches
//   `dispatching` or later, the main session should never be re-creating or
//   removing the worktree. Keeping the classifier strict and the matrix
//   permissive keeps that scope tight.
//
// Guard conditions (all must hold):
//   - command shape is `git worktree add …` OR `git worktree remove … --force …`
//   - state.worktree_path is a non-empty string AND appears in the command
//     (substring match — tolerates quoting and shell differences)
// Other worktree subcommands (`move`, `prune`) and `remove` without --force
// are intentionally NOT carved out; they should not appear during Step 2.
export function isWorktreeBootstrapCommand(command, state) {
  if (typeof command !== "string" || !command.trim()) return false;
  const worktreePath = state?.worktree_path;
  if (typeof worktreePath !== "string" || !worktreePath) return false;
  if (!command.includes(worktreePath)) return false;
  if (/^\s*git\s+worktree\s+add\b/.test(command)) return true;
  if (/^\s*git\s+worktree\s+remove\b[^\n]*--force\b/.test(command)) return true;
  return false;
}

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

// Plugin-namespacing-aware equality for agent names.
//
// Claude Code routes plugin-shipped subagents through a `<plugin>:<agent>`
// identifier (e.g. `try-claude-code:frontend-developer`), but plan authors
// may write `owner_agent` either way — bare (`frontend-developer`) or fully
// qualified. Strict `===` therefore splits the same logical agent into two
// non-matching strings and trips the runner gate.
//
// Rules:
//   - identical strings always match.
//   - one side bare + one side namespaced  → match when the namespaced side
//     ends with `:<bare>`. The bare form encodes "any plugin shipping an
//     agent of this name", which mirrors how `agents/<name>.md` lookups
//     resolve on disk (one file per plugin, name is the unique key inside
//     a plugin).
//   - both sides namespaced                → strict equality. Two plugins
//     can ship agents with the same short name; only the prefix
//     disambiguates them, so we refuse cross-plugin matches.
//
// Exported so `pre-tool-use-hook.mjs:maybeAutoArm` uses the same predicate.
// Drift between the two callers would let a dispatch pass the BLOCK gate
// without arming the stop-review phase, leaving the plan stuck at `preparing`.
export function agentNamesMatch(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a === b) return true;
  const aNs = a.includes(":");
  const bNs = b.includes(":");
  if (aNs && bNs) return false;
  if (aNs && a.endsWith(`:${b}`)) return true;
  if (bNs && b.endsWith(`:${a}`)) return true;
  return false;
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
  // dev_review.phase === "rework" and rely on the prose to pick correctly.
  return agentNamesMatch(subagent, state.owner_agent);
}

// Per-status disposition for each tool family. `allow`, `warn`, `block` are
// the three terminal verdicts; functions defer the choice to runtime context
// (e.g. classifying the Bash command, checking dispatch identity, the
// dev-review sub-state phase).
//
// Phase 4 reshape: only 5 rows now. Sub-states (rework vs Q&A inside Step 4,
// armed vs blocked inside Step 3) are checked through the `state.*.phase`
// fields inside the agent-dispatch resolver functions, not via separate
// rows. See state.dev_review.phase / state.stop_review.phase.
const MATRIX = {
  preparing: {
    // Step 1-2: worktree setup. The main session legitimately runs
    // `git worktree add` here to create the plan's worktree directory, and
    // `git worktree remove --force` to wipe a stale one before recreating.
    // `isWorktreeBootstrapCommand` narrows the ALLOW to commands that
    // touch `state.worktree_path`; every other mutation waits for the
    // plan-agent dispatch. The PreToolUse hook also auto-arms the gate
    // when it sees a matching Agent dispatch from this row.
    bashSafe: VERDICT.ALLOW,
    bashMutating: ({ toolInput, state }) =>
      isWorktreeBootstrapCommand(toolInput?.command, state)
        ? VERDICT.ALLOW
        : VERDICT.BLOCK,
    fileMutating: VERDICT.BLOCK,
    agentDispatch: ({ matchesPlan }) =>
      matchesPlan ? VERDICT.ALLOW : VERDICT.BLOCK,
  },
  dispatching: {
    // Step 3: stop-review gate active. `stop_review.phase` may be "armed"
    // (initial fire) or "blocked" (BLOCK feedback received, awaiting
    // re-dispatch). Both legitimately accept the same plan-agent dispatch.
    bashSafe: VERDICT.ALLOW,
    bashMutating: VERDICT.BLOCK,
    fileMutating: VERDICT.BLOCK,
    agentDispatch: ({ matchesPlan }) =>
      matchesPlan ? VERDICT.ALLOW : VERDICT.BLOCK,
  },
  dev_reviewing: {
    // Step 4. Sub-state branches:
    //   phase "rework"   → reviewer-chosen rework agent allowed.
    //   phase "awaiting" → reviewer reading; no dispatches until reply.
    //   phase "qa"       → main session answers in chat; no dispatches.
    bashSafe: VERDICT.ALLOW,
    bashMutating: VERDICT.BLOCK,
    fileMutating: VERDICT.BLOCK,
    agentDispatch: ({ state }) =>
      state.dev_review?.phase === "rework" ? VERDICT.ALLOW : VERDICT.BLOCK,
  },
  closing: {
    // Step 5: dev-review approved. Main session runs git merge / branch -d /
    // worktree remove. Mutating Bash is *expected* here; Edit/Write on the
    // worktree is unusual but not illegal — downgrade to warn.
    bashSafe: VERDICT.ALLOW,
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
    if (state.status === "dev_reviewing") {
      const phase = state.dev_review?.phase ?? null;
      if (phase !== "rework") {
        hint =
          `dev-review 단계 (phase="${phase}")에서는 Agent dispatch를 차단합니다. ` +
          `rework가 필요하면 begin-rework CLI를 먼저 호출해 phase를 "rework"로 옮기세요.`;
      }
    } else if (!ctx.matchesPlan) {
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
