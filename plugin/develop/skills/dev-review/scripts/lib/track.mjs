// Classify a file path into a coarse track for the change-map overview.
// Heuristics are rough and intentionally stable: we'd rather consistently
// pick "other" than guess wrong. The UI shows raw file lists too, so the
// track bucket is a summary aid, not a decision surface.

export function classifyTrack(filePath) {
  if (!filePath) return "other";
  const lower = filePath.toLowerCase();

  if (matches(lower, /\.md$|^docs\/|\/docs\/|^readme|changelog/i)) return "docs";
  if (matches(lower, /^plans?\/|\/plans\//)) return "docs";

  if (matches(lower, /\.(sql)$|^migrations?\/|\/migrations?\/|prisma\/|schema\.prisma/i)) return "db";

  if (matches(lower, /\.(tsx|jsx|vue|svelte|css|scss|sass|less)$|^(src\/)?(components|pages|app|views|styles)\//i)) return "frontend";
  if (matches(lower, /^(web|frontend|client|ui)\//)) return "frontend";

  if (matches(lower, /^(server|backend|api|services|workers)\//)) return "backend";
  if (matches(lower, /\.(py|go|rb|java|kt|rs|php|cs|mjs|cjs|ts|js)$/)) return "backend";

  if (matches(lower, /^\.github\/|^\.gitlab\/|dockerfile|docker-compose|\.ya?ml$|\.toml$|\.ini$|tsconfig|package(-lock)?\.json|pnpm-lock|yarn\.lock/i)) {
    return "config";
  }

  return "other";
}

function matches(text, re) {
  return re.test(text);
}

const ORDER = ["frontend", "backend", "db", "config", "docs", "other"];

export function emptyChangeMap() {
  return ORDER.map((track) => ({ track, files: 0, additions: 0, deletions: 0 }));
}

export function mergeChangeMap(entries, file) {
  const track = classifyTrack(file.path);
  const row = entries.find((e) => e.track === track);
  if (!row) return;
  row.files += 1;
  row.additions += file.additions || 0;
  row.deletions += file.deletions || 0;
}

export function compactChangeMap(entries) {
  // Preserve ORDER but drop rows with no activity.
  return entries.filter((e) => e.files > 0 || e.additions > 0 || e.deletions > 0);
}
