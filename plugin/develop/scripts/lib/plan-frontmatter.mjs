// Minimal plan-frontmatter reader for the runner pipeline.
//
// A plan file starts with a YAML frontmatter block fenced by `---` lines:
//
//     ---
//     plan_slug: login-frontend
//     branch: feat/login-frontend
//     owner_agent: frontend-developer
//     ---
//
//     # Plan body...
//
// We only need three flat string fields, so a full YAML parser would be
// overkill (and add a dependency). This reader handles the practical cases
// we ship — `key: value` lines, `#` comments, blank lines, and quoted
// values — and rejects anything more exotic so the runner fails loudly
// rather than silently mis-parsing.

import fs from "node:fs";

const FENCE = /^---\s*$/;

function unquote(value) {
  const v = value.trim();
  if (v.length >= 2) {
    const first = v[0];
    const last = v[v.length - 1];
    if ((first === '"' || first === "'") && first === last) {
      return v.slice(1, -1);
    }
  }
  return v;
}

// Read the frontmatter block at the top of `filePath`. Returns
// `{ headers, bodyOffsetLine }` where `headers` is an object of string fields
// and `bodyOffsetLine` is the line number where the body starts (1-indexed),
// or throws a descriptive error if the file does not have a frontmatter block.
//
// Errors thrown by this function are intended to be surfaced verbatim to the
// user (the UserPromptSubmit hook turns them into `decision: "block"` reasons),
// so phrasing matters: each message names the file and explains the fix.
export function readPlanFrontmatter(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Plan file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);

  // Skip a leading BOM-only or blank line so editors that auto-insert one
  // do not break the fence detection.
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i += 1;

  if (i >= lines.length || !FENCE.test(lines[i])) {
    throw new Error(
      `Plan file is missing the YAML frontmatter block: ${filePath}\n` +
      `The first non-blank line must be "---".`,
    );
  }
  i += 1;

  const headers = {};
  while (i < lines.length) {
    const line = lines[i];
    if (FENCE.test(line)) {
      return { headers, bodyOffsetLine: i + 2 };
    }
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      i += 1;
      continue;
    }
    const colon = line.indexOf(":");
    if (colon === -1) {
      throw new Error(
        `Invalid frontmatter line in ${filePath} (line ${i + 1}): ${line}\n` +
        `Each entry must be "key: value".`,
      );
    }
    const key = line.slice(0, colon).trim();
    const value = unquote(line.slice(colon + 1));
    if (!key) {
      throw new Error(
        `Empty key in frontmatter at ${filePath} (line ${i + 1}).`,
      );
    }
    headers[key] = value;
    i += 1;
  }

  throw new Error(
    `Frontmatter block in ${filePath} is not closed with a "---" line.`,
  );
}

// Validate the three fields the runner depends on. Returns a normalized
// `{ planSlug, branch, ownerAgent }` object on success, throws on missing or
// malformed values. The slug regex is intentionally strict so the on-disk
// state path stays well-formed.
export function extractRunnerHeaders(filePath, headers) {
  const planSlug = (headers.plan_slug ?? "").trim();
  const branch = (headers.branch ?? "").trim();
  const ownerAgent = (headers.owner_agent ?? "").trim();

  const missing = [];
  if (!planSlug) missing.push("plan_slug");
  if (!branch) missing.push("branch");
  if (!ownerAgent) missing.push("owner_agent");
  if (missing.length > 0) {
    throw new Error(
      `Plan ${filePath} is missing required frontmatter field(s): ${missing.join(", ")}`,
    );
  }

  if (!/^[A-Za-z0-9._-]+$/.test(planSlug)) {
    throw new Error(
      `plan_slug "${planSlug}" in ${filePath} contains characters that would ` +
      `make the on-disk state path ambiguous. Use letters, digits, dots, ` +
      `underscores, or hyphens.`,
    );
  }

  return { planSlug, branch, ownerAgent };
}
