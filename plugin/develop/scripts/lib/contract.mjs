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

// Agent.description for a phase dispatch, e.g. "Phase 3: add JWT middleware".
// The leading "Phase N" form is what PHASE_DESC_RE extracts.
export function buildPhaseDescription(phaseNumber, shortSummary) {
  return `Phase ${phaseNumber}: ${shortSummary}`;
}

// Leading block of a phase-dispatch Agent.prompt. The "You are working in: ..."
// line is what WORKTREE_PATH_RE extracts; any wording change must update the
// regex too.
export function buildWorktreePromptHeader(worktreePath) {
  return `## Working directory\nYou are working in: ${worktreePath}\ncd to this directory before starting any work.`;
}

// ---------------------------------------------------------------------------
// Hook regexes — what the hook scripts parse out of already-emitted prompts
// and Bash commands.
// ---------------------------------------------------------------------------

// Match "Phase 3" / "PHASE 10" / "phase 7:" etc. at the start of an
// Agent.description string. Captures the phase number as group 1.
export const PHASE_DESC_RE = /^Phase\s+(\d+)/i;

// Match the "You are working in: <path>" line inside an Agent.prompt. Captures
// the worktree path as group 1 (no surrounding quotes; whitespace-delimited).
export const WORKTREE_PATH_RE = /You are working in:\s*(\S+)/;

// Match `git worktree add [-C <dir>] [-b <branch>] <path>` inside a Bash
// command string. Captures (1) optional -C target, (2) optional branch name,
// (3) the worktree path.
export const WORKTREE_ADD_RE =
  /git\s+(?:-C\s+(\S+)\s+)?worktree\s+add\s+(?:-b\s+(\S+)\s+)?(\S+)/;

// Match `git worktree remove [-C <dir>] [--force] <path>`. Captures (1)
// optional -C target, (2) the worktree path.
export const WORKTREE_REMOVE_RE =
  /git\s+(?:-C\s+(\S+)\s+)?worktree\s+remove\s+(?:--force\s+)?(\S+)/;

// ---------------------------------------------------------------------------
// Soft-match detectors — used by the match-failure warning layer to spot
// format drift when a string "looks like" a phase dispatch or worktree line
// but fails the primary regex. Positive matches here + negative matches on
// the primary regex indicate the contract has drifted.
// ---------------------------------------------------------------------------

export const SOFT_PHASE_HINT_RE = /phase/i;
export const SOFT_WORKTREE_PATH_HINT_RE = /\bwork(?:ing)?\s+dir|worktree\s+dir|working in/i;
