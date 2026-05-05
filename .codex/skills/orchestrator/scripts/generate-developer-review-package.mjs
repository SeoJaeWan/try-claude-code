#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const SCHEMA_VERSION = 1;

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = generateDeveloperReviewPackage(options);
    process.stdout.write(`review_data=${toPosix(path.relative(options.repoRoot, result.reviewDataPath))}\n`);
    process.stdout.write(`feedback=${toPosix(path.relative(options.repoRoot, result.feedbackPath))}\n`);
    process.stdout.write(`review_history=${toPosix(path.relative(options.repoRoot, result.reviewHistoryPath))}\n`);
    process.stdout.write(`plan_signature=${result.planSignature}\n`);
  } catch (error) {
    process.stderr.write(`[developer-review-package] error: ${error.message}\n`);
    process.exit(error.exitCode || 1);
  }
}

export function generateDeveloperReviewPackage(options) {
  const repoRoot = path.resolve(options.repoRoot || process.cwd());
  const taskSlug = options.taskSlug;
  if (!/^[A-Za-z0-9_-]+$/.test(taskSlug || "")) {
    throw usageError("Missing or invalid --task-slug. Use only ASCII letters, digits, _, and -.");
  }

  const planPath = path.resolve(repoRoot, options.planPath || path.join("plans", taskSlug, "plan.md"));
  const reviewPath = path.resolve(
    repoRoot,
    options.reviewPath || path.join("plans", "_orchestrator", "review", taskSlug, "review.md")
  );
  const outDir = path.resolve(repoRoot, options.outDir || path.join("plans", taskSlug, "developer-review"));
  const now = options.now || new Date().toISOString();

  const planText = readRequiredUtf8(planPath, "plan");
  const phaseRefs = discoverPhaseRefs(planText, planPath);
  const phaseFiles = phaseRefs
    .map((ref) => ref.filePath)
    .filter(Boolean)
    .filter((filePath, index, all) => all.indexOf(filePath) === index);
  const phaseTexts = new Map(phaseFiles.map((filePath) => [filePath, readRequiredUtf8(filePath, "phase detail")]));
  const reviewText = readRequiredUtf8(reviewPath, "review");

  const sourceTexts = [
    { filePath: planPath, label: "plan", text: planText },
    ...Array.from(phaseTexts.entries()).map(([filePath, text]) => ({ filePath, label: "phase detail", text })),
    { filePath: reviewPath, label: "review", text: reviewText }
  ];
  assertNoLossySourceText(sourceTexts, options.allowLossyQuestionMarks);

  const planSignature = options.planSignature || computePlanSignature([
    { filePath: planPath, text: planText },
    ...Array.from(phaseTexts.entries()).map(([filePath, text]) => ({ filePath, text }))
  ]);

  const reviewMeta = parseReviewArtifact(reviewText);
  if (reviewMeta.planSignature && reviewMeta.planSignature !== planSignature) {
    const error = new Error(
      `review.md plan_signature ${reviewMeta.planSignature} does not match current plan_signature ${planSignature}`
    );
    error.exitCode = 3;
    throw error;
  }

  const reviewData = buildReviewData({
    repoRoot,
    taskSlug,
    planPath,
    planText,
    phaseRefs,
    phaseTexts,
    reviewMeta,
    planSignature
  });

  ensureDir(outDir);
  const reviewDataPath = path.join(outDir, "review-data.json");
  const feedbackPath = path.join(outDir, "feedback.json");
  const reviewHistoryPath = path.join(outDir, "review-history.json");

  const existingFeedback = readJsonIfPresent(feedbackPath);
  const existingHistory = readJsonIfPresent(reviewHistoryPath);

  writeJsonAtomic(reviewDataPath, reviewData);
  writeJsonAtomic(feedbackPath, buildFeedback(reviewData, existingFeedback, now));
  writeJsonAtomic(reviewHistoryPath, buildReviewHistory(reviewData, existingHistory));

  return { reviewDataPath, feedbackPath, reviewHistoryPath, planSignature };
}

function parseArgs(argv) {
  const repoRoot = process.cwd();
  const options = { repoRoot, allowLossyQuestionMarks: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      process.stdout.write(`Usage: node .codex/skills/orchestrator/scripts/generate-developer-review-package.mjs --task-slug <task-slug> [options]\n\n`);
      process.stdout.write("Options:\n");
      process.stdout.write("  --plan-path <path>        Default: plans/{task-slug}/plan.md\n");
      process.stdout.write("  --review-path <path>      Default: plans/_orchestrator/review/{task-slug}/review.md\n");
      process.stdout.write("  --out-dir <path>          Default: plans/{task-slug}/developer-review\n");
      process.stdout.write("  --plan-signature <sig>    Use controller-computed signature instead of recomputing\n");
      process.stdout.write("  --now <iso>               Stable timestamp for feedback initialization\n");
      process.stdout.write("  --allow-lossy-question-marks  Do not fail on prose lines containing ??\n");
      process.exit(0);
    }
    if (arg === "--allow-lossy-question-marks") {
      options.allowLossyQuestionMarks = true;
      continue;
    }
    if (!arg.startsWith("--")) {
      throw usageError(`Unexpected positional argument: ${arg}`);
    }
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw usageError(`Missing value for ${arg}`);
    }
    i += 1;
    if (arg === "--task-slug") options.taskSlug = value;
    else if (arg === "--plan-path") options.planPath = value;
    else if (arg === "--review-path") options.reviewPath = value;
    else if (arg === "--out-dir") options.outDir = value;
    else if (arg === "--plan-signature") options.planSignature = value;
    else if (arg === "--now") options.now = value;
    else throw usageError(`Unknown option: ${arg}`);
  }
  return options;
}

function usageError(message) {
  const error = new Error(message);
  error.exitCode = 2;
  return error;
}

function readRequiredUtf8(filePath, label) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    const wrapped = new Error(`Cannot read ${label} as UTF-8: ${filePath} (${error.message})`);
    wrapped.exitCode = 3;
    throw wrapped;
  }
}

function assertNoLossySourceText(sources, allowLossyQuestionMarks) {
  const findings = [];
  for (const source of sources) {
    if (source.text.includes("\uFFFD")) {
      findings.push(`${source.label} ${source.filePath} contains Unicode replacement characters`);
    }
    if (!allowLossyQuestionMarks) {
      for (const line of suspiciousQuestionMarkLines(source.text)) {
        findings.push(`${source.label} ${source.filePath}:${line.number} contains suspicious '${line.sample}'`);
      }
    }
  }
  if (!findings.length) return;
  const error = new Error(
    [
      "source text appears to be already encoding-damaged; regenerate or rewrite the source artifacts as UTF-8 first",
      ...findings.map((finding) => `- ${finding}`)
    ].join("\n")
  );
  error.exitCode = 4;
  throw error;
}

function suspiciousQuestionMarkLines(text) {
  const lines = text.split(/\r?\n/);
  const result = [];
  let inFence = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const proseOnly = line.replace(/`[^`]*`/g, "");
    const match = proseOnly.match(/\?{2,}/);
    if (match) {
      result.push({ number: index + 1, sample: match[0] });
    }
  }
  return result;
}

function buildReviewData({ repoRoot, taskSlug, planPath, planText, phaseRefs, phaseTexts, reviewMeta, planSignature }) {
  const title = firstHeading(planText) || taskSlug;
  const requestScope = parseKeyValueTable(section(planText, "요청과 범위"));
  const changeShapeSection = section(planText, "변경 형상");
  const changeShapeTable = parseFirstTable(changeShapeSection);
  const executionRows = parseFirstTable(section(planText, "실행 흐름")).rows;
  const riskRows = parseFirstTable(section(planText, "리스크와 검증")).rows;

  const overview = {
    user_request: listFromCell(requestScope.get("사용자 요청")),
    understanding: firstParagraphWithoutTables(changeShapeSection) || `${title} 계획의 범위와 실행 흐름을 검토합니다.`,
    included_scope: listFromCell(requestScope.get("포함 범위")),
    excluded_scope: listFromCell(requestScope.get("제외 범위")),
    change_shape: firstParagraphWithoutTables(changeShapeSection),
    change_flow: executionRows.map((row, index) => flowRowSummary(row, index)),
    major_changes: [
      ...changeShapeTable.rows.map((row) => tableRowSummary(row, ["변경 축", "현재", "목표"])),
      ...executionRows.map((row, index) => {
        const phase = row["Phase"] || row["단계"] || `단계 ${index + 1}`;
        const change = row["주요 변경"] || row["목적"] || "";
        return compactJoin([phase, change], ": ");
      })
    ].filter(Boolean),
    risks: riskRows.map((row) => tableRowSummary(row, ["리스크 / 엣지 케이스", "영향", "완화 또는 검증"])),
    ui_previews: []
  };

  const inlinePhaseTexts = buildInlinePhaseTexts(planText, phaseRefs);
  const phases = phaseRefs.map((ref, index) => buildPhase({
    ref,
    index,
    phaseText: ref.filePath ? phaseTexts.get(ref.filePath) : inlinePhaseTexts.get(index) || "",
    flowRow: executionRows[index] || {},
    planDir: path.dirname(planPath)
  }));

  const reviewData = {
    schema_version: SCHEMA_VERSION,
    task_slug: taskSlug,
    plan_path: toPosix(path.relative(repoRoot, planPath)),
    plan_signature: planSignature,
    review_outcome: reviewMeta.outcome || "ready",
    post_approval_next_action: "plan-tdd",
    post_approval_next_label: "다음 단계: $plan-tdd",
    post_approval_next_summary: "리뷰가 승인되면 production code 구현 전에 승인된 plan.md 기준으로 source-tree TDD 계약 테스트와 tdd.md를 작성합니다.",
    title,
    overview,
    phases,
    review_findings: reviewMeta.findings
  };

  reviewData.overview.review_item_signature = reviewItemSignatureFromPayload(overviewSignaturePayload(reviewData));
  reviewData.phases.forEach((phase, index) => {
    phase.review_item_signature = reviewItemSignatureFromPayload(phaseSignaturePayload(reviewData, phase, index));
  });

  return reviewData;
}

function buildPhase({ ref, index, phaseText, flowRow }) {
  const id = `P${index + 1}`;
  const detailTitle = phaseText ? firstHeading(phaseText) : "";
  const title = stripPhasePrefix(detailTitle || ref.title || flowRow["Phase"] || `Phase ${index + 1}`);
  const goalRows = parseKeyValueTable(sectionAtAnyLevel(phaseText, "목표와 완료 신호"));
  const workflowRows = parseFirstTable(sectionAtAnyLevel(phaseText, "작업 흐름")).rows;
  const boundaryRows = parseFirstTable(sectionAtAnyLevel(phaseText, "변경 경계")).rows;
  const contractRows = parseFirstTable(sectionAtAnyLevel(phaseText, "시나리오 / 계약")).rows;
  const fileRows = parseFirstTable(sectionAtAnyLevel(phaseText, "파일 영향")).rows;
  const validationRows = parseFirstTable(sectionAtAnyLevel(phaseText, "검증")).rows;
  const riskRows = parseFirstTable(sectionAtAnyLevel(phaseText, "리스크 / 주의점")).rows;
  const ownerAgent = ownerAgentFromText(phaseText) || ref.ownerAgent || "";

  const changes = [
    flowRow["주요 변경"],
    ...workflowRows.map((row) => tableRowSummary(row, ["순서", "작업", "이유", "완료 조건"])),
    ...boundaryRows.map((row) => tableRowSummary(row, ["boundary (변경 경계)", "변경 내용", "유지할 것", "제약"]))
  ].filter(Boolean);

  const validation = [
    flowRow["완료 신호"],
    flowRow["검증"],
    goalRows.get("완료 신호"),
    ...validationRows.map((row) => tableRowSummary(row, ["검증 항목", "확인 수단", "기대 결과"]))
  ].filter(Boolean);

  const fileImpacts = [
    flowRow["커밋 경계"] ? `커밋 경계: ${flowRow["커밋 경계"]}` : "",
    ...fileRows.map((row) => tableRowSummary(row, ["파일", "작업 방식", "완료 조건"]))
  ].filter(Boolean);

  return {
    id,
    title,
    owner_agent: ownerAgent,
    goal: goalRows.get("목표") || flowRow["목적"] || "",
    changes,
    contracts: contractRows.map((row) => tableRowSummary(row, ["scenario (시나리오)", "input", "output", "negative/no-op", "owner"])),
    file_impacts: fileImpacts,
    validation,
    risks: riskRows.map((row) => tableRowSummary(row, ["리스크", "failure/validation", "대응"])),
    ui_previews: []
  };
}

function parseReviewArtifact(text) {
  const frontmatter = parseFrontmatter(text);
  return {
    outcome: stringValue(frontmatter.get("outcome")),
    planSignature: stringValue(frontmatter.get("plan_signature")),
    findings: extractReviewFindings(text)
  };
}

function parseFrontmatter(text) {
  const result = new Map();
  if (!text.startsWith("---")) return result;
  const end = text.indexOf("\n---", 3);
  if (end < 0) return result;
  const raw = text.slice(3, end).split(/\r?\n/);
  for (const line of raw) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    result.set(match[1], parseYamlScalar(match[2]));
  }
  return result;
}

function parseYamlScalar(value) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  return trimmed.replace(/^["']|["']$/g, "");
}

function extractReviewFindings(text) {
  const findingsSection = section(text, "Findings") || text;
  const severities = [
    ["Blocker", "blocker"],
    ["Major", "major"],
    ["Minor", "minor"]
  ];
  const findings = [];
  for (const [heading, severity] of severities) {
    for (const item of listItems(sectionByLevel(findingsSection, 3, heading))) {
      findings.push(`${severity}: ${item}`);
    }
  }
  if (findings.length) return findings;
  return listItems(findingsSection);
}

function discoverPhaseRefs(planText, planPath) {
  const planDir = path.dirname(planPath);
  const executionRows = parseFirstTable(section(planText, "실행 흐름")).rows;
  const topRows = parseFirstTable(planText).rows;
  const rows = executionRows.length ? executionRows : topRows;
  const refs = rows
    .map((row, index) => {
      const rawPath = row["상세 문서"] || row["Phase"] || "";
      const ownerAgent = row["Agent"] || row["owner_agent"] || "";
      const filePath = resolveMarkdownRef(rawPath, planDir);
      return {
        title: row["Phase"] || row["목적"] || `Phase ${index + 1}`,
        ownerAgent,
        filePath
      };
    })
    .filter((ref) => ref.filePath || ref.title);

  if (refs.length) return refs;

  const phasesDir = path.join(planDir, "phases");
  if (!fs.existsSync(phasesDir)) return [];
  return fs.readdirSync(phasesDir)
    .filter((name) => /^\d{2}-.+\.md$/.test(name))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ title: name.replace(/^\d{2}-|\.md$/g, ""), ownerAgent: "", filePath: path.join(phasesDir, name) }));
}

function buildInlinePhaseTexts(planText, phaseRefs) {
  const result = new Map();
  phaseRefs.forEach((ref, index) => {
    if (ref.filePath) return;
    const text = inlinePhaseText(planText, index + 1);
    if (text) result.set(index, text);
  });
  return result;
}

function inlinePhaseText(planText, phaseNumber) {
  const lines = planText.split(/\r?\n/);
  let start = -1;
  let level = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^(#{3,6})\s+(?:Phase|단계)\s*([0-9]+)\b/i);
    if (!match || Number(match[2]) !== phaseNumber) continue;
    start = i;
    level = match[1].length;
    break;
  }
  if (start < 0) return "";
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    const heading = lines[i].match(/^(#{1,6})\s+/);
    if (heading && heading[1].length <= level) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n").trim();
}

function resolveMarkdownRef(value, baseDir) {
  const cleaned = stripMarkdown(value).match(/(?:\.\/|\.\.\/|plans\/|phases\/)[^\s)]+\.md/)?.[0] || "";
  if (!cleaned) return null;
  const resolved = path.resolve(baseDir, cleaned);
  return fs.existsSync(resolved) ? resolved : null;
}

function parseKeyValueTable(text) {
  const result = new Map();
  for (const row of parseFirstTable(text).rows) {
    const key = row["항목"] || row["key"] || row["Key"] || Object.values(row)[0];
    const value = row["내용"] || row["value"] || row["Value"] || Object.values(row)[1];
    if (key) result.set(stripMarkdown(key), stripMarkdown(value));
  }
  return result;
}

function parseFirstTable(text) {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length - 1; i += 1) {
    if (!isTableRow(lines[i]) || !isSeparatorRow(lines[i + 1])) continue;
    const headers = splitTableRow(lines[i]).map(stripMarkdown);
    const rows = [];
    for (let j = i + 2; j < lines.length; j += 1) {
      if (!isTableRow(lines[j]) || isSeparatorRow(lines[j])) break;
      const cells = splitTableRow(lines[j]).map(stripMarkdown);
      const row = {};
      headers.forEach((header, index) => {
        row[header] = cells[index] || "";
      });
      rows.push(row);
    }
    return { headers, rows };
  }
  return { headers: [], rows: [] };
}

function splitTableRow(line) {
  let value = line.trim();
  if (value.startsWith("|")) value = value.slice(1);
  if (value.endsWith("|")) value = value.slice(0, -1);
  return value.split("|").map((cell) => cell.trim());
}

function isTableRow(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}

function isSeparatorRow(line) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function section(text, heading) {
  return sectionByLevel(text, 2, heading);
}

function sectionAtAnyLevel(text, heading) {
  if (!text) return "";
  const lines = text.split(/\r?\n/);
  let start = -1;
  let level = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^(#{1,6})\s+(.+?)\s*$/);
    if (!match || stripMarkdown(match[2]) !== heading) continue;
    start = i + 1;
    level = match[1].length;
    break;
  }
  if (start < 0) return "";
  let end = lines.length;
  for (let i = start; i < lines.length; i += 1) {
    const match = lines[i].match(/^(#{1,6})\s+/);
    if (match && match[1].length <= level) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n").trim();
}

function sectionByLevel(text, level, heading) {
  if (!text) return "";
  const marker = "#".repeat(level);
  const nextMarker = new RegExp(`^#{1,${level}}\\s+`);
  const lines = text.split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const normalized = lines[i].trim();
    if (normalized === `${marker} ${heading}`) {
      start = i + 1;
      break;
    }
  }
  if (start < 0) return "";
  let end = lines.length;
  for (let i = start; i < lines.length; i += 1) {
    if (nextMarker.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n").trim();
}

function firstHeading(text) {
  const match = text.match(/^#{1,6}\s+(.+)$/m);
  return match ? stripMarkdown(match[1]) : "";
}

function firstParagraphWithoutTables(text) {
  const lines = text.split(/\r?\n/);
  const parts = [];
  let inTable = false;
  for (const line of lines) {
    if (isTableRow(line)) {
      inTable = true;
      continue;
    }
    if (inTable && !line.trim()) {
      inTable = false;
      continue;
    }
    if (inTable || !line.trim() || line.trim().startsWith(">")) continue;
    parts.push(stripMarkdown(line));
    if (parts.join(" ").length > 240) break;
  }
  return parts.join(" ").trim();
}

function ownerAgentFromText(text) {
  const match = text.match(/^\s*-\s*owner_agent:\s*`?([^`\s]+)`?\s*$/m);
  return match ? match[1] : "";
}

function listItems(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*[-*]\s+(.*)$/)?.[1] || "")
    .map(stripMarkdown)
    .filter((value) => value && !isNone(value));
}

function listFromCell(value) {
  const cleaned = stripMarkdown(value || "");
  if (!cleaned || isNone(cleaned)) return [];
  return cleaned
    .split(/\s*(?:<br\s*\/?>|;|ㆍ)\s*/i)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !isNone(item));
}

function tableRowSummary(row, preferredHeaders) {
  const parts = preferredHeaders
    .map((header) => [header, stripMarkdown(row[header] || "")])
    .filter(([, value]) => value && !isNone(value));
  if (!parts.length) {
    return Object.values(row).map(stripMarkdown).filter(Boolean).join(" / ");
  }
  return parts.map(([header, value]) => `${header}: ${value}`).join(" / ");
}

function flowRowSummary(row, index) {
  const phase = row["Phase"] || row["단계"] || `단계 ${index + 1}`;
  const goal = row["목적"] || "";
  const done = row["완료 신호"] || "";
  return compactJoin([phase, compactJoin([goal, done], " -> ")], ": ");
}

function compactJoin(values, separator) {
  return values.map(stripMarkdown).filter(Boolean).join(separator);
}

function stripPhasePrefix(value) {
  return stripMarkdown(value).replace(/^단계\s*\d+\.\s*/, "").trim();
}

function stripMarkdown(value) {
  return String(value || "")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/<br\s*\/?>/gi, "; ")
    .replace(/\s+/g, " ")
    .trim();
}

function isNone(value) {
  return /^(없음|none|null|n\/a|-)$/.test(String(value).trim().toLowerCase());
}

function stringValue(value) {
  return typeof value === "string" ? value : "";
}

function computePlanSignature(inputs) {
  const hash = crypto.createHash("sha256");
  for (const input of [...inputs].sort((a, b) => a.filePath.localeCompare(b.filePath))) {
    hash.update(toPosix(input.filePath));
    hash.update("\n");
    hash.update(input.text || "");
    hash.update("\n");
  }
  return hash.digest("hex").slice(0, 12);
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const ignored = new Set(["review_item_signature", "signature"]);
    return Object.keys(value)
      .filter((key) => !ignored.has(key) && value[key] !== undefined)
      .sort()
      .reduce((result, key) => {
        result[key] = canonicalize(value[key]);
        return result;
      }, {});
  }
  return value ?? null;
}

function hashString(value) {
  let h1 = 0xdeadbeef ^ value.length;
  let h2 = 0x41c6ce57 ^ value.length;
  for (let i = 0; i < value.length; i += 1) {
    const ch = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `rvw-${(h2 >>> 0).toString(16).padStart(8, "0")}${(h1 >>> 0).toString(16).padStart(8, "0")}`;
}

function reviewGlobalContext(model) {
  const overview = model?.overview || {};
  return {
    task_slug: model?.task_slug || "",
    title: model?.title || "",
    review_outcome: model?.review_outcome || "",
    review_findings: asArray(model?.review_findings),
    overview_scope: {
      user_request: asArray(overview.user_request),
      included_scope: asArray(overview.included_scope),
      excluded_scope: asArray(overview.excluded_scope),
      change_shape: overview.change_shape || "",
      change_flow: asArray(overview.change_flow),
      major_changes: asArray(overview.major_changes)
    }
  };
}

function overviewSignaturePayload(model) {
  const overview = model?.overview || {};
  return {
    kind: "overview",
    id: "overview",
    title: model?.title || "",
    review_outcome: model?.review_outcome || "",
    review_findings: asArray(model?.review_findings),
    overview: {
      user_request: asArray(overview.user_request),
      understanding: overview.understanding || "",
      included_scope: asArray(overview.included_scope),
      excluded_scope: asArray(overview.excluded_scope),
      change_shape: overview.change_shape || "",
      change_flow: asArray(overview.change_flow),
      major_changes: asArray(overview.major_changes),
      risks: asArray(overview.risks),
      ui_previews: asArray(overview.ui_previews)
    }
  };
}

function phaseSignaturePayload(model, phase, index) {
  return {
    kind: "phase",
    id: phase?.id || `P${index + 1}`,
    global_context: reviewGlobalContext(model),
    phase: {
      id: phase?.id || `P${index + 1}`,
      title: phase?.title || "",
      owner_agent: phase?.owner_agent || "",
      goal: phase?.goal || "",
      changes: asArray(phase?.changes),
      contracts: asArray(phase?.contracts),
      file_impacts: asArray(phase?.file_impacts),
      validation: asArray(phase?.validation),
      risks: asArray(phase?.risks),
      ui_previews: asArray(phase?.ui_previews)
    }
  };
}

function reviewItemSignatureFromPayload(payload) {
  return hashString(JSON.stringify(canonicalize(payload)));
}

function buildFeedback(reviewData, existingFeedback, now) {
  const steps = [
    { id: "overview", signature: reviewData.overview.review_item_signature },
    ...reviewData.phases.map((phase, index) => ({
      id: phase.id || `P${index + 1}`,
      signature: phase.review_item_signature
    })),
    { id: "final", signature: `final-${reviewData.plan_signature}` }
  ];

  const feedback = {
    schema_version: SCHEMA_VERSION,
    task_slug: reviewData.task_slug,
    plan_signature: reviewData.plan_signature,
    review_status: "in_progress",
    updated_at: now,
    steps: {},
    cards: {}
  };

  for (const step of steps) {
    const prior = existingFeedback?.steps?.[step.id];
    if (prior?.status === "approved" && prior?.approved_against?.review_item_signature === step.signature) {
      const carriedFrom = prior.approved_against.plan_signature === reviewData.plan_signature
        ? prior.approved_against.carried_from_plan_signature || null
        : prior.approved_against.plan_signature || existingFeedback?.plan_signature || null;
      feedback.steps[step.id] = {
        status: "approved",
        comment: typeof prior.comment === "string" ? prior.comment : "",
        approved_against: {
          plan_signature: reviewData.plan_signature,
          review_item_signature: step.signature,
          approved_at: prior.approved_against.approved_at || now,
          carried_from_plan_signature: carriedFrom === reviewData.plan_signature ? null : carriedFrom
        }
      };
    } else {
      feedback.steps[step.id] = { status: "", comment: "" };
    }
  }

  return feedback;
}

function buildReviewHistory(reviewData, existingHistory) {
  if (existingHistory && existingHistory.task_slug && existingHistory.task_slug !== reviewData.task_slug) {
    const error = new Error(`review-history.json task_slug ${existingHistory.task_slug} does not match ${reviewData.task_slug}`);
    error.exitCode = 3;
    throw error;
  }
  return {
    schema_version: SCHEMA_VERSION,
    task_slug: reviewData.task_slug,
    current_plan_signature: reviewData.plan_signature,
    rounds: Array.isArray(existingHistory?.rounds) ? existingHistory.rounds : []
  };
}

function readJsonIfPresent(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJsonAtomic(filePath, value) {
  ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, filePath);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function toPosix(filePath) {
  return String(filePath).split(path.sep).join("/");
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main();
}
