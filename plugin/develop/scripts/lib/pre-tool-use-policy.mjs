// PreToolUse policy — decides whether a tool call is allowed while a runner
// plan is mid-flight.
//
// The runner skill is prose Claude reads each turn (SKILL.md). Hard guarantees
// only exist where hooks intercept the tool boundary. This module owns the
// "given the active plan's status and the tool's target, what verdict?"
// decision and is invoked by `pre-tool-use-hook.mjs`.
//
// Three verdicts:
//   - "allow"  — call is consistent with the current status, proceed silently.
//   - "warn"   — call is suspicious but not destructive (e.g. editing an
//                unrelated file mid-review). The hook surfaces a systemMessage
//                but does not block.
//   - "block"  — call would violate the runner's invariants (e.g. directly
//                editing the plan-state JSON, or mutating the worktree from
//                outside it during dispatching). The hook emits
//                `decision: "block"` with the returned reason.
//
// This module is pure: no fs, no env, no spawn. The hook resolves the active
// plan-state and current tool input, then asks `evaluate({...})` for a
// verdict. That separation keeps the rule unit-testable across every
// (status, tool, command-shape, cwd) combination without spawning a hook.
//
// Design — target-location rule (Phase 2 reshape):
//
//   The previous policy was a 5×4 status×tool matrix. Half its complexity
//   existed to distinguish "the main session is touching the worktree" from
//   "the dispatched sub-agent is touching the worktree" — but PreToolUse's
//   payload does not surface a caller identifier, so the matrix had to
//   pessimistically BLOCK both. That blocked legitimate sub-agent commits
//   during `dispatching`, which was the root cause of the BLOCK-replay loop
//   the runner kept getting stuck in.
//
//   The new rule sidesteps caller identification by reading the tool call's
//   *target* instead: if the tool's working directory (Bash) or file_path
//   (Edit / Write) is inside the active plan's worktree, the call is the
//   agent's work and ALLOWed. Main session calls run from the repo root
//   (runner SKILL.md Core rule 7), so their targets land outside the
//   worktree directory and the existing BLOCK rules still apply.
//
//   Caveat: during dev_reviewing/awaiting we still want to BLOCK worktree
//   edits as drift protection for the reviewer's diff — even if someone
//   manages to issue an edit "from inside" the worktree. So the
//   target-inside-worktree ALLOW only fires in phases where an agent is
//   legitimately working: dispatching/* and dev_reviewing/rework.
//
// Status semantics (5-status enum). Sub-states (rework/qa/awaiting inside
// dev-review, armed/blocked/passed inside stop-review) live on
// `state.{stop_review,dev_review}.phase`.
//
//   preparing      — fresh plan; worktree may not exist yet. Step 1-2.
//                    Main session legitimately runs `git worktree add`
//                    (carved out by isWorktreeBootstrapCommand). All other
//                    mutations wait for Step 3's plan-agent dispatch.
//   dispatching    — Step 3. Plan-agent dispatched; its commits inside the
//                    worktree are ALLOWed. Main session mutations from
//                    outside the worktree are BLOCKed.
//   dev_reviewing  — Step 4. `dev_review.phase` distinguishes awaiting /
//                    rework / qa. Only `rework` permits agent dispatch AND
//                    worktree edits (the rework agent commits inside the
//                    worktree just like the plan agent did).
//   closing        — Step 5: dev-review approved. Main session runs git
//                    merge / branch -d / worktree remove. Mutating Bash is
//                    expected; Edit/Write on the (now-removed) worktree is
//                    downgraded to warn.
//   merged         — Terminal. UserPromptSubmit refuses re-entry, so this
//                    is mostly defensive — treat as no-active-plan.

import path from "node:path";

import {
  DEV_REVIEW_PHASE,
  STATUS,
  TERMINAL_STATUSES,
} from "./runner-state-machine.mjs";

// Tools that can mutate the filesystem. Bash is handled separately so its
// row can read the command shape.
const MUTATING_FILE_TOOLS = new Set(["Edit", "Write", "NotebookEdit"]);

// Bash commands the runner skill needs every turn — read-only inspection and
// the runner-state CLI itself. Anything matching these patterns is "safe"
// regardless of status; everything else is "mutating" and gated by status.
//
// Phase 2 reshape: the dual SAFE/MUTATING regex lists collapsed to one
// SAFE list. "Anything not safe" is treated as mutating — that flips a
// previous false-positive bias toward strict (a few unknown commands now
// hit the mutating row instead of being silently ALLOWed). Safe-list
// patterns stay broad and conservative.
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
  // surface for diagnostics.
  /^\s*pnpm\s+(exec|test|run\s+test)\b/,
];

// Step 2 worktree bootstrap commands. The main session legitimately runs
// `git worktree add` to create the plan's worktree directory and
// `git worktree remove --force` to wipe a stale one before recreating.
// Only at `preparing` and only when the command actually mentions
// `state.worktree_path` (substring match — tolerates quoting differences).
//
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

// Strip optional git-level flags (`-C <path>`, `--git-dir=...`,
// `--work-tree=...`, `--no-pager`, `-c key=value`) before classifying. Without
// this, `git -C "<worktree>" log` would not match the read-only git regex.
function stripGitGlobalFlags(command) {
  return command.replace(
    /^(\s*git\s+)(?:(?:-C\s+(?:"[^"]*"|'[^']*'|\S+)|--git-dir(?:=|\s+)(?:"[^"]*"|'[^']*'|\S+)|--work-tree(?:=|\s+)(?:"[^"]*"|'[^']*'|\S+)|--no-pager|-c\s+\S+)\s+)+/,
    "$1"
  );
}

// Classify a Bash command. The new rule has two buckets only — anything not
// matching SAFE_BASH_PATTERNS is treated as mutating (and gated by status).
//
//   "safe"     — never blocked.
//   "mutating" — gated by status.
//
// Empty / whitespace-only commands are classified as safe; nothing to gate.
export function classifyBashCommand(command) {
  if (typeof command !== "string" || !command.trim()) return "safe";
  const normalized = stripGitGlobalFlags(command);
  for (const re of SAFE_BASH_PATTERNS) {
    if (re.test(normalized)) return "safe";
  }
  return "mutating";
}

// Path containment helper. Returns true when `p` lies inside any of `dirs`.
// Relative paths are treated as ambiguous (inside) on the strict side.
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

// True when the tool call's *target* lies inside the active plan's worktree.
// This is the predicate that distinguishes "the dispatched sub-agent is
// editing its files" from "the main session is poking at the worktree":
//
//   - For Edit / Write / NotebookEdit, the target is `file_path`.
//   - For Bash, the target is `cwd`. The plan-dispatch.md prompt instructs
//     the agent to `cd` into `{{worktree_path}}` before its first command,
//     so its commits / file mutations land here while main session calls
//     (run from repo root per runner SKILL.md Core rule 7) do not.
//
// Returns false for tools where the convention doesn't apply.
function toolOriginatesInsideWorktree(toolName, toolInput, worktreePath) {
  if (typeof worktreePath !== "string" || !worktreePath) return false;
  if (MUTATING_FILE_TOOLS.has(toolName)) {
    const fp = toolInput?.file_path ?? toolInput?.path ?? toolInput?.notebook_path;
    return isPathInsideAny(fp, [worktreePath]);
  }
  if (toolName === "Bash") {
    const cwd = toolInput?.cwd;
    if (typeof cwd === "string" && isPathInsideAny(cwd, [worktreePath])) {
      return true;
    }
    return false;
  }
  return false;
}

// True when the tool call's target lies inside the plan's worktree OR plan
// state directory. Used to decide whether an "outside" call should be
// downgraded from block to warn (the user is allowed to do unrelated work
// in the repo while a plan waits for review).
function toolTargetsPlanArea(toolName, toolInput, planAreas) {
  if (!planAreas?.length) return true; // unknown areas → strict.
  if (MUTATING_FILE_TOOLS.has(toolName)) {
    const fp = toolInput?.file_path ?? toolInput?.path ?? toolInput?.notebook_path;
    return isPathInsideAny(fp, planAreas);
  }
  if (toolName === "Bash") {
    const cwd = toolInput?.cwd;
    if (typeof cwd === "string" && isPathInsideAny(cwd, planAreas)) return true;
    const cmd = typeof toolInput?.command === "string" ? toolInput.command : "";
    for (const dir of planAreas) {
      if (!dir) continue;
      if (cmd.includes(dir)) return true;
    }
    return false;
  }
  return true; // unknown tools: strict.
}

// Plugin-namespacing-aware equality for agent names.
//
// Claude Code routes plugin-shipped subagents through a `<plugin>:<agent>`
// identifier (e.g. `try-claude-code:frontend-developer`), but plan authors
// may write `owner_agent` either way — bare or fully qualified. Strict
// `===` would split the same logical agent into two non-matching strings.
//
// Rules:
//   - identical strings always match.
//   - one side bare + one side namespaced → match when the namespaced side
//     ends with `:<bare>`.
//   - both sides namespaced → strict equality (refuse cross-plugin matches).
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

// Does this Agent / Task dispatch correspond to the active plan's owner_agent?
function dispatchMatchesPlan(toolInput, state) {
  if (!state) return false;
  const subagent = toolInput?.subagent_type;
  if (typeof subagent !== "string") return false;
  return agentNamesMatch(subagent, state.owner_agent);
}

// A background Agent dispatch (`run_in_background: true`) returns
// immediately from the tool call while the agent keeps working asynchronously.
// The runner skill's Stop-hook contract relies on the foreground default —
// the dispatch call blocks until the agent finishes, so commits are in place
// when the Stop hook reviews them. Background dispatches risk reviewing
// zero-commit ranges as if they were plan output.
function isBackgroundDispatch(toolInput) {
  return toolInput?.run_in_background === true;
}

// True when the Edit/Write target is the plan-state JSON itself. Plan-state
// edits must go through runner-state-cli.mjs — direct Edit / Write would
// bypass schema validation and the transition table. Independent of status
// because the same rule applies whenever a plan is active.
function isPlanStateEdit(toolName, toolInput) {
  if (!MUTATING_FILE_TOOLS.has(toolName)) return false;
  const fp = toolInput?.file_path ?? toolInput?.path ?? toolInput?.notebook_path;
  return typeof fp === "string" && fp.endsWith(".runner-state.json");
}

// Build a Korean reason string. The `[runner 정책 ... · 에러 아님]` prefix
// exists because Claude Code surfaces PreToolUse `decision: "block"` with a
// red "Error:" label — the prefix tells the reader the block is an intended
// safety guardrail, not a failure.
function reasonFor({ verdict, status, planSlug, statePath, hint }) {
  const label = verdict === VERDICT.WARN ? "정책 알림 · 에러 아님" : "정책 차단 · 에러 아님";
  const head = `[runner ${label}] 활성 plan(${planSlug}, status="${status}") 보호 중입니다.`;
  const body = hint || "현재 상태에서는 허용되지 않은 도구 호출입니다.";
  const tail =
    `state: ${statePath}\n` +
    `필요하면 runner skill 안내에 따라 다음 단계로 진행하세요. 한 세션 = 한 plan 규칙은 ` +
    `메인 세션이 worktree를 직접 수정해 dev-review와 어긋나는 것을 막기 위한 것입니다.`;
  return `${head}\n${body}\n${tail}`;
}

// Decide a file-mutating tool call (Edit / Write / NotebookEdit). The same
// shape covers preparing / dispatching / dev_reviewing / closing; only the
// "originates inside worktree" downgrade fires in agent-active phases.
function decideFileMutating({ state, toolName, toolInput, planAreas }) {
  // Plan-state JSON is always BLOCK regardless of status — must go through CLI.
  if (isPlanStateEdit(toolName, toolInput)) {
    return {
      verdict: VERDICT.BLOCK,
      hint:
        `plan-state JSON 직접 편집은 차단됩니다. ` +
        `상태 전이는 runner-state-cli.mjs 서브커맨드를 통해서만 수행하세요.`,
    };
  }

  const insideWorktree = toolOriginatesInsideWorktree(
    toolName,
    toolInput,
    state.worktree_path,
  );
  const insidePlanArea = toolTargetsPlanArea(toolName, toolInput, planAreas);

  // closing: dev-review approved; worktree is being removed. Worktree edits
  // are unusual but not illegal — downgrade everything to warn.
  if (state.status === STATUS.CLOSING) {
    return { verdict: VERDICT.WARN };
  }

  // Agent-active phases: dispatching, dev_reviewing/rework. Inside-worktree
  // edits are the agent's work — ALLOW. Outside-plan-area edits warn.
  // Inside-plan-area-but-not-worktree (e.g. plan dir notes) still block.
  const agentActive =
    state.status === STATUS.DISPATCHING ||
    (state.status === STATUS.DEV_REVIEWING &&
      state.dev_review?.phase === DEV_REVIEW_PHASE.REWORK);

  if (agentActive && insideWorktree) {
    return { verdict: VERDICT.ALLOW };
  }

  // Reviewer-protection phases (dev_reviewing/awaiting, dev_reviewing/qa) and
  // preparing: worktree edits BLOCK so the reviewer's diff doesn't drift.
  // Outside-plan-area edits downgrade to warn.
  if (!insidePlanArea) {
    return {
      verdict: VERDICT.WARN,
      hint:
        `활성 plan이 진행 중이지만 이 편집은 worktree와 plan 디렉터리 밖이라 ` +
        `차단하지 않습니다. plan과 무관한 작업을 같은 세션에서 하는 경우 ` +
        `리뷰 중 컨텍스트가 섞일 수 있으니 주의하세요.`,
    };
  }
  return {
    verdict: VERDICT.BLOCK,
    hint:
      `메인 세션은 ${state.status}${state.dev_review?.phase ? `/${state.dev_review.phase}` : ""} ` +
      `상태에서 worktree 또는 plan 디렉터리를 직접 수정할 수 없습니다. ` +
      `해당 작업은 dispatch된 agent가 담당합니다.`,
  };
}

// Decide a Bash call. Safe commands ALLOW always; mutating depends on
// status and whether the call originates inside the worktree.
function decideBash({ state, toolInput }) {
  const command = toolInput?.command ?? "";
  const klass = classifyBashCommand(command);
  if (klass === "safe") {
    return { verdict: VERDICT.ALLOW };
  }

  const insideWorktree = toolOriginatesInsideWorktree(
    "Bash",
    toolInput,
    state.worktree_path,
  );

  if (state.status === STATUS.CLOSING) {
    // Step 5: git merge / branch -d / worktree remove are expected.
    return { verdict: VERDICT.ALLOW };
  }

  if (state.status === STATUS.PREPARING) {
    // Step 2 carve-out: worktree bootstrap commands ALLOW.
    if (isWorktreeBootstrapCommand(command, state)) {
      return { verdict: VERDICT.ALLOW };
    }
    return {
      verdict: VERDICT.BLOCK,
      hint:
        `preparing 단계에서는 \`git worktree add\` / \`git worktree remove --force\` 외의 ` +
        `mutating Bash가 차단됩니다 (\`${command.slice(0, 80)}\`).`,
    };
  }

  // dispatching, dev_reviewing
  const agentActive =
    state.status === STATUS.DISPATCHING ||
    (state.status === STATUS.DEV_REVIEWING &&
      state.dev_review?.phase === DEV_REVIEW_PHASE.REWORK);

  if (agentActive && insideWorktree) {
    return { verdict: VERDICT.ALLOW };
  }

  return {
    verdict: VERDICT.BLOCK,
    hint:
      `Bash 명령이 worktree 또는 git 상태를 변경할 수 있습니다 ` +
      `(\`${command.slice(0, 80)}\`). 현재 상태(${state.status}` +
      `${state.dev_review?.phase ? `/${state.dev_review.phase}` : ""})에서는 ` +
      `메인 세션의 mutating Bash가 차단됩니다.`,
  };
}

// Decide an Agent / Task dispatch.
function decideAgentDispatch({ state, toolInput }) {
  const status = state.status;

  if (status === STATUS.CLOSING) {
    return {
      verdict: VERDICT.WARN,
      hint:
        `closing 단계에서 Agent dispatch는 비정상적입니다. plan은 이미 승인되어 ` +
        `정리 중이므로 새 dispatch가 필요하면 plan을 다시 만드는 게 맞습니다.`,
    };
  }

  // dev_reviewing — only phase="rework" permits dispatch; subagent_type is
  // reviewer-chosen so we don't enforce owner_agent match here.
  if (status === STATUS.DEV_REVIEWING) {
    const phase = state.dev_review?.phase ?? null;
    if (phase !== DEV_REVIEW_PHASE.REWORK) {
      return {
        verdict: VERDICT.BLOCK,
        hint:
          `dev-review 단계 (phase="${phase}")에서는 Agent dispatch를 차단합니다. ` +
          `rework가 필요하면 begin-rework CLI를 먼저 호출해 phase를 "rework"로 옮기세요.`,
      };
    }
    if (isBackgroundDispatch(toolInput)) {
      return {
        verdict: VERDICT.BLOCK,
        hint:
          `rework dispatch를 백그라운드(run_in_background: true)로 호출하면 ` +
          `tool 호출이 즉시 리턴되어 메인 세션이 commit 없이 턴을 끝낼 위험이 있습니다. ` +
          `포그라운드(기본값)로 dispatch해서 호출이 agent 완료까지 block되게 하세요.`,
      };
    }
    return { verdict: VERDICT.ALLOW };
  }

  // preparing, dispatching — must match owner_agent and be foreground.
  if (!dispatchMatchesPlan(toolInput, state)) {
    return {
      verdict: VERDICT.BLOCK,
      hint:
        `Agent 호출이 활성 plan의 owner_agent(${state.owner_agent})와 일치하지 않습니다. ` +
        `현재 status에서는 plan dispatch 외 Agent 호출을 차단합니다.`,
    };
  }
  if (isBackgroundDispatch(toolInput)) {
    return {
      verdict: VERDICT.BLOCK,
      hint:
        `plan-agent를 백그라운드(run_in_background: true)로 dispatch하면 Agent 호출이 ` +
        `즉시 리턴되어 메인 세션이 commit 없이 턴을 끝낼 수 있습니다. 그 상태에서 Stop hook이 ` +
        `발화하면 base 브랜치의 마지막 commit을 plan 작업으로 오인할 수 있어 매우 위험합니다. ` +
        `포그라운드(기본값)로 dispatch해서 호출이 agent 완료까지 block되게 하세요.`,
    };
  }
  return { verdict: VERDICT.ALLOW };
}

// Main entry. `state` is the active plan-state (already filtered to the one
// non-terminal pointer for this session) or null. `toolName` and `toolInput`
// come straight from the PreToolUse payload. `planAreas` is a list of
// absolute directories the rule considers "plan-owned" — typically the
// worktree path and the plans/{plan_key}/ directory.
//
// Returns { decision: VERDICT.*, reason: string|null }.
export function evaluate({ state, toolName, toolInput, planAreas }) {
  if (!state || TERMINAL_STATUSES.has(state.status)) {
    return { decision: VERDICT.ALLOW, reason: null };
  }

  let result;
  if (toolName === "Bash") {
    result = decideBash({ state, toolInput });
  } else if (MUTATING_FILE_TOOLS.has(toolName)) {
    result = decideFileMutating({ state, toolName, toolInput, planAreas });
  } else if (toolName === "Task" || toolName === "Agent") {
    result = decideAgentDispatch({ state, toolInput });
  } else {
    // Tools we don't gate (Read, Glob, Grep, AskUserQuestion, etc.).
    return { decision: VERDICT.ALLOW, reason: null };
  }

  if (result.verdict === VERDICT.ALLOW) {
    return { decision: VERDICT.ALLOW, reason: null };
  }
  return {
    decision: result.verdict,
    reason: reasonFor({
      verdict: result.verdict,
      status: state.status,
      planSlug: state.plan_slug,
      statePath: state.__statePath ?? "(state path unknown)",
      hint: result.hint,
    }),
  };
}
