import fs from "node:fs";

// The QA report from qa-verify is markdown with per-track sections. The exact
// shape has evolved; this parser is tolerant of missing sections and only
// extracts what the review UI needs: track name, status verdict, summary line.

const TRACK_HEADING = /^#{1,6}\s*(Frontend|Backend|DB|Database|Infra|General)\b/i;
const STATUS_LINE = /^\s*\*\*Status:\*\*\s*(pass|warn|fail|skipped)\b/i;
const SUMMARY_LINE = /^\s*\*\*Summary:\*\*\s*(.+?)\s*$/i;

export function readQaReport(qaPath) {
  if (!qaPath) return [];
  if (!fs.existsSync(qaPath)) return [];

  const text = fs.readFileSync(qaPath, "utf8");
  const lines = text.split(/\r?\n/);

  const tracks = [];
  let current = null;

  const finish = () => {
    if (current) tracks.push(current);
    current = null;
  };

  for (const line of lines) {
    const heading = line.match(TRACK_HEADING);
    if (heading) {
      finish();
      current = {
        track: normalizeTrack(heading[1]),
        status: "unknown",
        summary: "",
      };
      continue;
    }

    if (!current) continue;

    const status = line.match(STATUS_LINE);
    if (status) {
      current.status = status[1].toLowerCase();
      continue;
    }

    const summary = line.match(SUMMARY_LINE);
    if (summary) {
      current.summary = summary[1];
      continue;
    }
  }

  finish();

  return tracks.filter((t) => t.track && t.status !== "unknown");
}

function normalizeTrack(raw) {
  const map = {
    frontend: "frontend",
    backend: "backend",
    db: "db",
    database: "db",
    infra: "infra",
    general: "general",
  };
  return map[raw.toLowerCase()] || raw.toLowerCase();
}
