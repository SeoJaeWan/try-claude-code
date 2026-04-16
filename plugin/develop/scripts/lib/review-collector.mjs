import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function nowIso() {
  return new Date().toISOString();
}

function sanitizeBranch(branch) {
  return branch.replace(/\//g, "-");
}

/**
 * Scan plans/{name}/plan.md to find the directory whose Branch header matches the given branch.
 * Returns the plan directory path or null.
 */
export function findPlanDirByBranch(workspaceRoot, branch) {
  const plansRoot = path.join(workspaceRoot, "plans");
  if (!fs.existsSync(plansRoot)) {
    return null;
  }

  let entries;
  try {
    entries = fs.readdirSync(plansRoot, { withFileTypes: true });
  } catch {
    return null;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const planFile = path.join(plansRoot, entry.name, "plan.md");
    if (!fs.existsSync(planFile)) {
      continue;
    }
    try {
      const head = fs.readFileSync(planFile, "utf8").slice(0, 512);
      const match = head.match(/\*\*Branch:\*\*\s*(.+)/);
      if (match && match[1].trim() === branch) {
        return path.join(plansRoot, entry.name);
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Resolve the main worktree root (the actual repo, not a linked worktree).
 */
function resolveRepoRoot(cwd) {
  try {
    const raw = execSync("git worktree list --porcelain", {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const match = raw.match(/^worktree\s+(.+)/m);
    return match ? match[1].trim() : cwd;
  } catch {
    return cwd;
  }
}

/**
 * Save a BLOCK review to {repoRoot}/.codex/reviews/{sanitized-branch}/{headSha}.md
 *
 * @param {string} workspaceRoot - workspace (or worktree) root
 * @param {object} opts
 * @param {string} opts.branch  - worktree branch
 * @param {string} opts.headSha - HEAD commit SHA at BLOCK time
 * @param {string} opts.reason  - BLOCK reason (first line) from stop-review-gate
 * @param {string} [opts.details] - full BLOCK output including all findings
 * @param {string} [opts.diff]  - optional diff stat
 */
export function collectBlockReview(workspaceRoot, { branch, headSha, reason, details, diff }) {
  const repoRoot = resolveRepoRoot(workspaceRoot);
  const dir = path.join(repoRoot, ".codex", "reviews", sanitizeBranch(branch));
  fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${headSha}.md`);
  const timestamp = nowIso();

  let content = `# BLOCK — ${timestamp}\n\n`;
  content += `**Branch:** ${branch}\n`;
  content += `**Commit:** ${headSha}\n\n`;
  content += `## Reason\n\n${reason}\n`;
  if (details && details !== reason) {
    content += `\n## Details\n\n${details}\n`;
  }
  if (diff) {
    content += `\n## Diff Stat\n\n\`\`\`\n${diff}\n\`\`\`\n`;
  }

  fs.writeFileSync(filePath, content, "utf8");
}
