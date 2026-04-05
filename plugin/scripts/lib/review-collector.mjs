import fs from "node:fs";
import path from "node:path";

function nowIso() {
  return new Date().toISOString();
}

function sanitizeBranch(branch) {
  return branch.replace(/\//g, "-");
}

/**
 * Save a BLOCK review to .reviews/{sanitized-branch}/{headSha}.md
 *
 * @param {string} workspaceRoot - repo root
 * @param {object} opts
 * @param {string} opts.branch  - worktree branch
 * @param {string} opts.headSha - HEAD commit SHA at BLOCK time
 * @param {string} opts.reason  - BLOCK reason from stop-review-gate
 * @param {string} [opts.diff]  - optional diff stat
 */
export function collectBlockReview(workspaceRoot, { branch, headSha, reason, diff }) {
  const dir = path.join(workspaceRoot, ".reviews", sanitizeBranch(branch));
  fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${headSha}.md`);
  const timestamp = nowIso();

  let content = `# BLOCK — ${timestamp}\n\n`;
  content += `**Branch:** ${branch}\n`;
  content += `**Commit:** ${headSha}\n\n`;
  content += `## Reason\n\n${reason}\n`;
  if (diff) {
    content += `\n## Diff Stat\n\n\`\`\`\n${diff}\n\`\`\`\n`;
  }

  fs.writeFileSync(filePath, content, "utf8");
}
