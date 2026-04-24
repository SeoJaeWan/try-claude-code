// Parse a git unified diff (with `diff --git` headers) into a structure the UI
// can render without re-parsing. We keep this intentionally small — the UI's
// diff component does the rest.

const FILE_HEADER = /^diff --git a\/(.+?) b\/(.+)$/;
const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

export function parseUnifiedDiff(diffText) {
  const lines = diffText.split(/\r?\n/);
  const files = [];
  let currentFile = null;
  let currentHunk = null;
  let beforeLineNo = 0;
  let afterLineNo = 0;

  const finishHunk = () => {
    if (currentHunk) {
      currentFile.diff_hunks.push(currentHunk);
      currentHunk = null;
    }
  };

  const finishFile = () => {
    finishHunk();
    if (currentFile) {
      files.push(currentFile);
      currentFile = null;
    }
  };

  for (const raw of lines) {
    if (raw.startsWith("diff --git")) {
      finishFile();
      const match = raw.match(FILE_HEADER);
      if (match) {
        currentFile = {
          path: match[2],
          oldPath: match[1] !== match[2] ? match[1] : null,
          diff_hunks: [],
        };
      }
      continue;
    }

    if (!currentFile) continue;

    if (raw.startsWith("--- ") || raw.startsWith("+++ ")) continue;
    if (raw.startsWith("index ") || raw.startsWith("new file mode")
        || raw.startsWith("deleted file mode") || raw.startsWith("similarity index")
        || raw.startsWith("rename from") || raw.startsWith("rename to")
        || raw.startsWith("Binary files ")) {
      continue;
    }

    const hunkMatch = raw.match(HUNK_HEADER);
    if (hunkMatch) {
      finishHunk();
      beforeLineNo = Number.parseInt(hunkMatch[1], 10);
      afterLineNo = Number.parseInt(hunkMatch[3], 10);
      currentHunk = { header: raw, before: [], after: [] };
      continue;
    }

    if (!currentHunk) continue;

    if (raw.startsWith("+")) {
      currentHunk.after.push({ line_no: afterLineNo, text: raw.slice(1) });
      afterLineNo += 1;
    } else if (raw.startsWith("-")) {
      currentHunk.before.push({ line_no: beforeLineNo, text: raw.slice(1) });
      beforeLineNo += 1;
    } else if (raw.startsWith(" ")) {
      const text = raw.slice(1);
      currentHunk.before.push({ line_no: beforeLineNo, text });
      currentHunk.after.push({ line_no: afterLineNo, text });
      beforeLineNo += 1;
      afterLineNo += 1;
    }
    // "\\ No newline at end of file" and similar meta lines are ignored.
  }

  finishFile();
  return files;
}

// Given a target file + line range string ("34-42" or "34"), find the first
// hunk in the parsed diff that touches that range. Returns evidence snippet.
export function findEvidence(parsedFiles, targetFile, targetLines) {
  const file = parsedFiles.find((f) => f.path === targetFile || f.oldPath === targetFile);
  if (!file) return null;

  const [startRaw, endRaw] = (targetLines || "").split("-");
  const start = Number.parseInt(startRaw, 10);
  const end = Number.parseInt(endRaw ?? startRaw, 10);

  for (const hunk of file.diff_hunks) {
    const touches = [...hunk.before, ...hunk.after].some((line) => {
      if (!Number.isFinite(line.line_no)) return false;
      if (!Number.isFinite(start)) return true;
      return line.line_no >= start && line.line_no <= (Number.isFinite(end) ? end : start);
    });
    if (touches) {
      const snippetLines = hunk.after.slice(0, 20).map((l) => l.text);
      const firstLineNo = hunk.after[0]?.line_no ?? hunk.before[0]?.line_no ?? 0;
      const lastLineNo = hunk.after[hunk.after.length - 1]?.line_no
        ?? hunk.before[hunk.before.length - 1]?.line_no ?? firstLineNo;
      return {
        file: file.path,
        lines: `${firstLineNo}-${lastLineNo}`,
        snippet: snippetLines.join("\n"),
      };
    }
  }

  const hunk = file.diff_hunks[0];
  if (!hunk) return null;
  const snippetLines = hunk.after.slice(0, 20).map((l) => l.text);
  const firstLineNo = hunk.after[0]?.line_no ?? hunk.before[0]?.line_no ?? 0;
  const lastLineNo = hunk.after[hunk.after.length - 1]?.line_no ?? firstLineNo;
  return {
    file: file.path,
    lines: `${firstLineNo}-${lastLineNo}`,
    snippet: snippetLines.join("\n"),
  };
}

export function totalsFor(files) {
  let additions = 0;
  let deletions = 0;
  for (const f of files) {
    for (const h of f.diff_hunks) {
      additions += h.after.length - f.diff_hunks.flatMap((x) => x.after).filter((l) => f.diff_hunks.some((h2) => h2.before.includes(l))).length;
      // fall back to counting plus/minus lines from the hunk markers in text
    }
  }
  return { additions, deletions };
}
