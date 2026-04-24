import fs from "node:fs";

export function readPriorFeedback(priorFeedbackPath, currentPlanSignature) {
  if (!priorFeedbackPath) return null;
  if (!fs.existsSync(priorFeedbackPath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(priorFeedbackPath, "utf8"));
    if (!parsed || parsed.plan_signature !== currentPlanSignature) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readPriorHistory(priorHistoryPath) {
  if (!priorHistoryPath) return null;
  if (!fs.existsSync(priorHistoryPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(priorHistoryPath, "utf8"));
  } catch {
    return null;
  }
}

// Given prior `review-history.json` and the current round's commits (with
// their parsed diffs), compute addressed_by_this_commit[] per commit.
//
// The rule: for each prior needs-change item with target.file, if any new
// commit's files_changed includes that path, emit an entry pointing to
// the first such commit.
export function computeAddressed(priorHistory, commits) {
  if (!priorHistory || !Array.isArray(priorHistory.rounds) || priorHistory.rounds.length === 0) {
    return;
  }

  const lastRound = priorHistory.rounds[priorHistory.rounds.length - 1];
  const needsChange = (lastRound.items || []).filter(
    (item) => item && item.user_status === "needs-change" && item.target && item.target.file,
  );

  if (needsChange.length === 0) return;

  const priorHeads = new Set(
    priorHistory.rounds
      .map((r) => r.resulting_task_head_sha)
      .filter(Boolean),
  );

  for (const commit of commits) {
    if (priorHeads.has(commit.sha)) continue;
    const addressed = [];
    for (const item of needsChange) {
      const touched = commit.files_changed.find((f) => f.path === item.target.file);
      if (!touched) continue;
      const evidence = pickEvidence(touched, item.target.lines);
      addressed.push({
        prior_card_id: item.card_id,
        prior_comment: item.user_comment || "",
        prior_target: item.target,
        resolution_evidence: evidence,
      });
    }
    if (addressed.length) commit.addressed_by_this_commit = addressed;
  }
}

function pickEvidence(file, targetLines) {
  if (!file || !file.diff_hunks || file.diff_hunks.length === 0) {
    return { file: file?.path ?? "", lines: "", snippet: "" };
  }

  const [startRaw, endRaw] = (targetLines || "").split("-");
  const start = Number.parseInt(startRaw, 10);
  const end = Number.parseInt(endRaw ?? startRaw, 10);

  for (const hunk of file.diff_hunks) {
    const touches = [...hunk.before, ...hunk.after].some((line) => {
      if (!Number.isFinite(line.line_no)) return false;
      if (!Number.isFinite(start)) return true;
      return line.line_no >= start && line.line_no <= (Number.isFinite(end) ? end : start);
    });
    if (touches) return hunkToEvidence(file.path, hunk);
  }

  return hunkToEvidence(file.path, file.diff_hunks[0]);
}

function hunkToEvidence(file, hunk) {
  const firstLineNo = hunk.after[0]?.line_no ?? hunk.before[0]?.line_no ?? 0;
  const lastLineNo = hunk.after[hunk.after.length - 1]?.line_no
    ?? hunk.before[hunk.before.length - 1]?.line_no ?? firstLineNo;
  return {
    file,
    lines: `${firstLineNo}-${lastLineNo}`,
    snippet: hunk.after.slice(0, 20).map((l) => l.text).join("\n"),
  };
}
