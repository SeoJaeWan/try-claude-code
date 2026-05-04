// Shared contract between the `runner` skill (which writes prompts) and the
// hook scripts (which parse them). Changing any value here MUST be mirrored in
// `plugin/develop/skills/runner/SKILL.md` because the skill instructs the LLM
// to produce prompts in exactly these shapes. The hook contract unit tests
// (`scripts/__tests__/hook-contract.test.mjs`) guard this in CI.

// ---------------------------------------------------------------------------
// Prompt shapes — what the runner skill instructs the model to emit.
// These are exported as both a documented template (reference) and a builder
// function used by tests.
// ---------------------------------------------------------------------------

// Agent.description for a plan dispatch, e.g. "Plan: login-frontend".
// The leading "Plan: <slug>" form is what PLAN_DESC_RE extracts.
export function buildPlanDescription(planSlug) {
  return `Plan: ${planSlug}`;
}

// Leading block of a plan-dispatch Agent.prompt. The "You are working in: ..."
// line is what WORKTREE_PATH_RE extracts; the "Read and execute the plan at:
// ..." line is what PLAN_PATH_RE extracts. Any wording change must update the
// regexes too.
export function buildWorktreePromptHeader(worktreePath) {
  return `## Working directory\nYou are working in: ${worktreePath}\ncd to this directory before starting any work.`;
}

export function buildPlanPromptHeader(planFilePath) {
  return `## Your plan\nRead and execute the plan at: ${planFilePath}`;
}

// ---------------------------------------------------------------------------
// Hook regexes — what the hook scripts parse out of already-emitted prompts
// and Bash commands.
// ---------------------------------------------------------------------------

// Match "Plan: <slug>" at the start of an Agent.description string. Captures
// the slug as group 1. The slug must be a single non-whitespace token so the
// regex stays anchored to a stable shape.
export const PLAN_DESC_RE = /^Plan:\s*(\S+)/;

// Match the "You are working in: <path>" line inside an Agent.prompt. Captures
// the worktree path as group 1. Uses (.+?)\s*$ in multiline mode so paths with
// spaces (e.g. "C:\My Documents\...") are captured correctly and trailing
// whitespace / CRLF is absorbed.
export const WORKTREE_PATH_RE = /You are working in:\s*(.+?)\s*$/m;

// Match the "Read and execute the plan at: <path>" line inside an Agent.prompt.
// Captures the absolute plan file path as group 1. Same shape as
// WORKTREE_PATH_RE — handles paths with spaces and CRLF tails.
export const PLAN_PATH_RE = /Read and execute the plan at:\s*(.+?)\s*$/m;

// Match `git worktree add [-C <dir>] [-b <branch>] <path>` inside a Bash
// command string. Captures (1) optional -C target, (2) optional branch name,
// (3) the worktree path.
export const WORKTREE_ADD_RE =
  /git\s+(?:-C\s+(\S+)\s+)?worktree\s+add\s+(?:-b\s+(\S+)\s+)?(\S+)/;

// Match `git worktree remove [-C <dir>] [--force] <path>`. Captures (1)
// optional -C target, (2) the worktree path.
export const WORKTREE_REMOVE_RE =
  /git\s+(?:-C\s+(\S+)\s+)?worktree\s+remove\s+(?:--force\s+)?(\S+)/;
