#!/usr/bin/env node

/**
 * plan.md와 plan-review 산출물을 browser developer review package로 변환하는 생성기.
 *
 * 출력은 `review-data.json`, `feedback.json`, `review-history.json`이며,
 * orchestrator의 developer review 서버가 이 파일들을 그대로 읽는다.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

/**
 * developer review package JSON schema version.
 *
 * @type {number}
 */
const SCHEMA_VERSION = 2;
/**
 * review-data 생성 규칙의 contract version.
 *
 * @type {number}
 */
const GENERATOR_CONTRACT_VERSION = 2;

/**
 * CLI 진입점.
 *
 * 인자를 파싱하고 review package를 생성한 뒤 orchestration이 읽을 key=value 결과를 출력한다.
 *
 * @returns {void}
 */
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

/**
 * developer review package 파일 3종을 생성한다.
 *
 * @param {object} options 생성 옵션.
 * @param {string} [options.repoRoot] repository root. 기본값은 현재 작업 디렉터리.
 * @param {string} options.taskSlug task slug.
 * @param {string} [options.planPath] plan.md 경로.
 * @param {string} [options.reviewPath] review.md 경로.
 * @param {string} [options.outDir] developer-review 출력 디렉터리.
 * @param {string} [options.planSignature] controller가 계산한 plan signature.
 * @param {string} [options.now] feedback 초기화에 사용할 ISO 시각.
 * @param {boolean} [options.allowLossyQuestionMarks] 손상 의심 물음표 검사를 건너뛸지 여부.
 * @returns {{ reviewDataPath: string, feedbackPath: string, reviewHistoryPath: string, planSignature: string }} 생성 결과 경로와 plan signature.
 */
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

  ensureDir(outDir);
  const reviewData = buildReviewData({
    repoRoot,
    taskSlug,
    outDir,
    planPath,
    planText,
    phaseRefs,
    phaseTexts,
    reviewMeta,
    planSignature
  });

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

/**
 * CLI 인자를 생성 옵션 객체로 변환한다.
 *
 * @param {string[]} argv `process.argv.slice(2)` 형태의 인자 배열.
 * @returns {object} 정규화된 생성 옵션.
 * @throws {Error} 알 수 없는 옵션이나 누락된 값이 있는 경우.
 */
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

/**
 * CLI 사용법 오류를 exit code와 함께 만든다.
 *
 * @param {string} message 오류 메시지.
 * @returns {Error & { exitCode?: number }} exit code 2가 설정된 오류.
 */
function usageError(message) {
  const error = new Error(message);
  error.exitCode = 2;
  return error;
}

/**
 * 필수 source artifact를 UTF-8 문자열로 읽는다.
 *
 * @param {string} filePath 읽을 파일 경로.
 * @param {string} label 오류 메시지에 사용할 source label.
 * @returns {string} UTF-8 파일 내용.
 * @throws {Error} 파일을 읽을 수 없는 경우.
 */
function readRequiredUtf8(filePath, label) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    const wrapped = new Error(`Cannot read ${label} as UTF-8: ${filePath} (${error.message})`);
    wrapped.exitCode = 3;
    throw wrapped;
  }
}

/**
 * plan/review source가 이미 인코딩 손상 상태인지 검사한다.
 *
 * @param {{ filePath: string, label: string, text: string }[]} sources 검사할 source 목록.
 * @param {boolean} allowLossyQuestionMarks 연속 물음표 검사를 허용할지 여부.
 * @returns {void}
 * @throws {Error} replacement character 또는 손상 의심 물음표가 발견된 경우.
 */
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

/**
 * 코드 블록과 inline code를 제외하고 손상 의심 연속 물음표가 있는 줄을 찾는다.
 *
 * @param {string} text 검사할 문서 문자열.
 * @returns {{ number: number, sample: string }[]} 의심 줄 번호와 표본.
 */
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

/**
 * plan.md, phase detail, review.md를 developer review 화면 모델로 변환한다.
 *
 * @param {object} input review-data 생성 입력.
 * @param {string} input.repoRoot repository root.
 * @param {string} input.taskSlug task slug.
 * @param {string} input.outDir developer-review 출력 디렉터리.
 * @param {string} input.planPath plan.md 절대 경로.
 * @param {string} input.planText plan.md 내용.
 * @param {object[]} input.phaseRefs phase 참조 목록.
 * @param {Map<string, string>} input.phaseTexts phase detail 경로와 내용 map.
 * @param {object} input.reviewMeta review.md metadata.
 * @param {string} input.planSignature 현재 plan signature.
 * @returns {object} review-data.json에 기록할 모델.
 */
function buildReviewData({ repoRoot, taskSlug, outDir, planPath, planText, phaseRefs, phaseTexts, reviewMeta, planSignature }) {
  const title = firstHeading(planText) || taskSlug;
  const requestScope = parseKeyValueTable(section(planText, "요청과 범위"));
  const changeShapeSection = section(planText, "변경 형상");
  const changeShapeTable = parseFirstTable(changeShapeSection);
  const executionRows = parseFirstTable(section(planText, "실행 흐름")).rows;
  const riskRows = parseFirstTable(section(planText, "리스크와 검증")).rows;
  const topologyContract = buildTopologyContract(planText);
  const evidenceArtifacts = buildEvidenceArtifacts({
    planText,
    planDir: path.dirname(planPath),
    outDir
  });

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
    ui_previews: [],
    topology_contract: topologyContract,
    evidence_artifacts: evidenceArtifacts
  };

  const inlinePhaseTexts = buildInlinePhaseTexts(planText, phaseRefs);
  const phases = phaseRefs.map((ref, index) => buildPhase({
    ref,
    index,
    phaseText: ref.filePath ? phaseTexts.get(ref.filePath) : inlinePhaseTexts.get(index) || "",
    flowRow: executionRows[index] || {},
    planDir: path.dirname(planPath),
    topologyContract,
    evidenceArtifacts
  }));

  const reviewData = {
    schema_version: SCHEMA_VERSION,
    generator_contract_version: GENERATOR_CONTRACT_VERSION,
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
    topology_contract: topologyContract,
    evidence_artifacts: evidenceArtifacts,
    review_findings: reviewMeta.findings
  };

  reviewData.overview.review_item_signature = reviewItemSignatureFromPayload(overviewSignaturePayload(reviewData));
  reviewData.phases.forEach((phase, index) => {
    phase.review_item_signature = reviewItemSignatureFromPayload(phaseSignaturePayload(reviewData, phase, index));
  });
  reviewData.review_items = buildReviewItems(reviewData);

  return reviewData;
}

/**
 * review-data에서 브라우저 승인 단위로 사용할 item 목록을 만든다.
 *
 * @param {object} reviewData 생성된 review-data 모델.
 * @returns {object[]} overview와 phase별 review item 배열.
 */
function buildReviewItems(reviewData) {
  return [
    {
      id: "overview",
      label: "Overview",
      kind: "overview",
      required: true,
      review_item_signature: reviewData.overview.review_item_signature,
      summary: reviewData.overview.understanding || reviewData.overview.change_shape || "",
      anchors: compactAnchors([
        anchor("scope", "요청과 범위", "scope", [
          ...asArray(reviewData.overview.user_request),
          ...asArray(reviewData.overview.included_scope),
          ...asArray(reviewData.overview.excluded_scope)
        ]),
        anchor("change-shape", "변경 형상", "section", reviewData.overview.change_shape),
        anchor("change-flow", "실행 흐름", "section", reviewData.overview.change_flow),
        anchor("major-changes", "주요 변경점", "section", reviewData.overview.major_changes),
        anchor("risks", "핵심 리스크", "section", reviewData.overview.risks),
        anchor("topology", "파일/폴더 구조 계약", "topology", reviewData.topology_contract),
        anchor("evidence", "체험 산출물", "evidence", reviewData.evidence_artifacts),
        anchor("findings", "Plan review findings", "finding", reviewData.review_findings)
      ])
    },
    ...reviewData.phases.map((phase) => ({
      id: phase.id,
      label: phase.title || phase.id,
      kind: "phase",
      required: true,
      owner_agent: phase.owner_agent || "",
      review_item_signature: phase.review_item_signature,
      summary: phase.goal || "",
      anchors: compactAnchors([
        anchor("goal", "목표", "section", phase.goal),
        anchor("changes", "변경 내용", "section", phase.changes),
        anchor("contracts", "계약", "contract", phase.contracts),
        anchor("file-impacts", "파일 영향", "file-impact", phase.file_impacts),
        anchor("validation", "검증", "validation", phase.validation),
        anchor("risks", "리스크 / 주의점", "risk", phase.risks),
        anchor("topology", "파일/폴더 구조 계약", "topology", phase.topology_contract),
        anchor("evidence", "체험 산출물", "evidence", phase.evidence_artifacts)
      ])
    }))
  ];
}

/**
 * review item 안의 section anchor metadata를 만든다.
 *
 * @param {string} id anchor id.
 * @param {string} label 화면 label.
 * @param {string} kind anchor 종류.
 * @param {unknown} source anchor가 실제로 표시할 source 값.
 * @returns {{ id: string, label: string, kind: string, present: boolean }} anchor metadata.
 */
function anchor(id, label, kind, source) {
  return {
    id,
    label,
    kind,
    present: hasReviewContent(source)
  };
}

/**
 * 내용이 없는 anchor를 제거하고 내부 `present` flag를 숨긴다.
 *
 * @param {object[]} anchors anchor 후보 목록.
 * @returns {object[]} 화면에 노출할 anchor 목록.
 */
function compactAnchors(anchors) {
  return anchors.filter((item) => item.present).map(({ present, ...item }) => item);
}

/**
 * review 화면에 노출할 만한 값이 있는지 확인한다.
 *
 * @param {unknown} value 검사할 값.
 * @returns {boolean} 빈 값이 아니면 `true`.
 */
function hasReviewContent(value) {
  if (Array.isArray(value)) return value.filter(Boolean).length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return Boolean(String(value || "").trim());
}

/**
 * phase 참조와 phase detail 본문을 review phase 모델로 변환한다.
 *
 * @param {object} input phase 생성 입력.
 * @param {object} input.ref phase 참조 정보.
 * @param {number} input.index phase index.
 * @param {string} input.phaseText phase detail 또는 inline phase 본문.
 * @param {object} input.flowRow plan 실행 흐름 표의 해당 행.
 * @param {object[]} [input.topologyContract=[]] 전체 topology contract 목록.
 * @param {object[]} [input.evidenceArtifacts=[]] 전체 evidence artifact 목록.
 * @returns {object} review-data의 phase 모델.
 */
function buildPhase({ ref, index, phaseText, flowRow, topologyContract = [], evidenceArtifacts = [] }) {
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
    ui_previews: [],
    topology_contract: topologyContract.filter((item) => itemMatchesPhase(item.phase, id)),
    evidence_artifacts: evidenceArtifacts.filter((item) => itemMatchesPhase(item.phase, id))
  };
}

/**
 * plan.md의 `파일/폴더 구조 계약` 표를 구조화된 topology contract로 변환한다.
 *
 * @param {string} planText plan.md 내용.
 * @returns {object[]} 경로별 topology contract 목록.
 */
function buildTopologyContract(planText) {
  return parseFirstTable(section(planText, "파일/폴더 구조 계약")).rows
    .map((row, index) => {
      const sourcePath = stripMarkdown(row["경로"] || row["path"] || row["Path"] || "");
      if (!sourcePath || isNone(sourcePath)) return null;
      const phase = normalizePhaseRef(row["소유 phase"] || row["phase"] || row["Phase"] || row["소유 단계"] || "");
      return {
        id: `T${index + 1}`,
        path: sourcePath,
        kind: stripMarkdown(row["종류"] || row["kind"] || row["Kind"] || ""),
        status: stripMarkdown(row["상태"] || row["status"] || row["Status"] || ""),
        phase,
        responsibility: stripMarkdown(row["책임"] || row["responsibility"] || row["Responsibility"] || ""),
        evidence: stripMarkdown(row["근거"] || row["evidence"] || row["Evidence"] || "")
      };
    })
    .filter(Boolean);
}

/**
 * plan evidence 파일을 developer-review asset 영역으로 복사하고 metadata를 만든다.
 *
 * @param {object} input evidence 생성 입력.
 * @param {string} input.planText plan.md 내용.
 * @param {string} input.planDir plan.md가 있는 디렉터리.
 * @param {string} input.outDir developer-review 출력 디렉터리.
 * @returns {object[]} 복사된 evidence artifact metadata.
 * @throws {Error} evidence 경로가 `evidence/**` 밖이거나 파일이 없을 때.
 */
function buildEvidenceArtifacts({ planText, planDir, outDir }) {
  const sourceRows = parseFirstTable(section(planText, "체험 산출물")).rows;
  const evidenceAssetRoot = path.join(outDir, "assets", "evidence");
  fs.rmSync(evidenceAssetRoot, { recursive: true, force: true });

  return sourceRows
    .map((row, index) => {
      const id = stripMarkdown(row["id"] || row["ID"] || `E${index + 1}`);
      const entry = stripMarkdown(row["경로"] || row["entry"] || row["asset"] || "");
      if (!entry || isNone(entry)) return null;
      const safeEntry = normalizeEvidenceEntry(entry);
      const sourcePath = path.resolve(planDir, safeEntry);
      const evidenceRoot = path.resolve(planDir, "evidence");
      if (!sourcePath.startsWith(`${evidenceRoot}${path.sep}`)) {
        throw evidenceError(`Evidence path escapes evidence root: ${entry}`);
      }
      if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
        throw evidenceError(`Evidence file not found: ${entry}`);
      }

      const relativeInsideEvidence = safeEntry.replace(/^evidence\//, "");
      const copiedRelative = toPosix(path.join("assets", "evidence", ...relativeInsideEvidence.split("/")));
      const targetPath = path.join(outDir, copiedRelative);
      ensureDir(path.dirname(targetPath));
      fs.copyFileSync(sourcePath, targetPath);
      const contentHash = crypto.createHash("sha256").update(fs.readFileSync(sourcePath)).digest("hex").slice(0, 12);
      const phase = normalizePhaseRef(row["phase"] || row["Phase"] || row["단계"] || "");

      return {
        id,
        phase,
        kind: stripMarkdown(row["kind"] || row["Kind"] || "evidence"),
        entry: safeEntry,
        asset: copiedRelative,
        content_hash: contentHash,
        purpose: stripMarkdown(row["목적"] || row["purpose"] || row["Purpose"] || ""),
        target_unit: stripMarkdown(row["대상 단위"] || row["target unit"] || row["Target unit"] || ""),
        covered_units: stripMarkdown(row["대상 수 / covered units"] || row["대상 수"] || row["covered units"] || row["Covered units"] || ""),
        input: stripMarkdown(row["input"] || row["Input"] || ""),
        function_adapter: stripMarkdown(row["function / adapter"] || row["function"] || row["adapter"] || row["Function / adapter"] || ""),
        output_recipient: stripMarkdown(row["output recipient"] || row["Output recipient"] || ""),
        negative_noop: stripMarkdown(row["negative/no-op"] || row["negative"] || row["no-op"] || row["negative/noop"] || ""),
        review_points: listFromCell(row["검토 포인트"] || row["covers"] || row["Covers"] || "")
      };
    })
    .filter(Boolean);
}

/**
 * plan의 evidence 경로를 안전한 상대 경로로 정규화한다.
 *
 * @param {string} value evidence 경로 후보.
 * @returns {string} `evidence/`로 시작하는 POSIX 상대 경로.
 * @throws {Error} 절대 경로, URL, 상위 경로 이탈, root 밖 경로인 경우.
 */
function normalizeEvidenceEntry(value) {
  const cleaned = toPosix(stripMarkdown(value)).replace(/^\.\/+/, "");
  if (!cleaned.startsWith("evidence/")) {
    throw evidenceError(`Evidence path must be under evidence/**: ${value}`);
  }
  if (path.isAbsolute(cleaned) || /^[A-Za-z]:/.test(cleaned) || cleaned.includes("\\") || /^https?:\/\//i.test(cleaned)) {
    throw evidenceError(`Evidence path must be a relative local path: ${value}`);
  }
  const normalized = path.posix.normalize(cleaned);
  if (normalized.startsWith("../") || normalized === ".." || normalized.includes("/../")) {
    throw evidenceError(`Evidence path must not contain '..': ${value}`);
  }
  return normalized;
}

/**
 * evidence 관련 오류에 일관된 exit code를 붙인다.
 *
 * @param {string} message 오류 메시지.
 * @returns {Error & { exitCode?: number }} exit code 3이 설정된 오류.
 */
function evidenceError(message) {
  const error = new Error(message);
  error.exitCode = 3;
  return error;
}

/**
 * plan 표의 phase 표기를 `P1`, `P2`, `all` 등으로 정규화한다.
 *
 * @param {string} value phase 표기.
 * @returns {string} 정규화된 phase 참조.
 */
function normalizePhaseRef(value) {
  const cleaned = stripMarkdown(value || "");
  if (!cleaned || isNone(cleaned)) return "";
  if (/^(all|전체)$/i.test(cleaned)) return "all";
  const match = cleaned.match(/^(?:P|Phase|단계)\s*([0-9]+)/i);
  if (match) return `P${Number(match[1])}`;
  return cleaned;
}

/**
 * 어떤 item이 특정 phase에 속하는지 확인한다.
 *
 * @param {string} value item의 phase 표기.
 * @param {string} phaseId 비교할 phase id.
 * @returns {boolean} 같은 phase이거나 `all`이면 `true`.
 */
function itemMatchesPhase(value, phaseId) {
  const normalized = normalizePhaseRef(value);
  return normalized === phaseId || normalized === "all";
}

/**
 * review.md에서 outcome, plan signature, findings를 추출한다.
 *
 * @param {string} text review.md 내용.
 * @returns {{ outcome: string, planSignature: string, findings: string[] }} review metadata.
 */
function parseReviewArtifact(text) {
  const frontmatter = parseFrontmatter(text);
  return {
    outcome: stringValue(frontmatter.get("outcome")),
    planSignature: stringValue(frontmatter.get("plan_signature")),
    findings: extractReviewFindings(text)
  };
}

/**
 * Markdown YAML frontmatter를 단순 key-value map으로 파싱한다.
 *
 * @param {string} text Markdown 원문.
 * @returns {Map<string, unknown>} frontmatter key-value map.
 */
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

/**
 * 제한된 YAML scalar 값을 boolean, 배열, 문자열로 파싱한다.
 *
 * @param {string} value scalar 문자열.
 * @returns {boolean | string | string[]} 파싱된 값.
 */
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

/**
 * review.md의 Findings section에서 severity가 붙은 finding 목록을 추출한다.
 *
 * @param {string} text review.md 내용.
 * @returns {string[]} finding 요약 목록.
 */
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

/**
 * plan.md에서 phase detail 파일 또는 inline phase 후보를 발견한다.
 *
 * @param {string} planText plan.md 내용.
 * @param {string} planPath plan.md 절대 경로.
 * @returns {{ title: string, ownerAgent: string, filePath: string | null }[]} phase 참조 목록.
 */
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

/**
 * filePath가 없는 phase 참조에 대응하는 inline phase 본문을 수집한다.
 *
 * @param {string} planText plan.md 내용.
 * @param {object[]} phaseRefs phase 참조 목록.
 * @returns {Map<number, string>} phase index와 inline phase 본문 map.
 */
function buildInlinePhaseTexts(planText, phaseRefs) {
  const result = new Map();
  phaseRefs.forEach((ref, index) => {
    if (ref.filePath) return;
    const text = inlinePhaseText(planText, index + 1);
    if (text) result.set(index, text);
  });
  return result;
}

/**
 * `### Phase N` 또는 `### 단계 N` heading 아래의 inline phase 본문을 추출한다.
 *
 * @param {string} planText plan.md 내용.
 * @param {number} phaseNumber 찾을 phase 번호.
 * @returns {string} inline phase 본문 또는 빈 문자열.
 */
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

/**
 * Markdown cell/text에서 실제 `.md` 파일 참조를 찾아 절대 경로로 해석한다.
 *
 * @param {string} value Markdown text.
 * @param {string} baseDir 상대 경로 기준 디렉터리.
 * @returns {string | null} 존재하는 markdown 파일 경로 또는 없으면 `null`.
 */
function resolveMarkdownRef(value, baseDir) {
  const cleaned = stripMarkdown(value).match(/(?:\.\/|\.\.\/|plans\/|phases\/)[^\s)]+\.md/)?.[0] || "";
  if (!cleaned) return null;
  const resolved = path.resolve(baseDir, cleaned);
  return fs.existsSync(resolved) ? resolved : null;
}

/**
 * 첫 번째 Markdown table을 key-value map으로 변환한다.
 *
 * @param {string} text table을 포함한 Markdown text.
 * @returns {Map<string, string>} key-value map.
 */
function parseKeyValueTable(text) {
  const result = new Map();
  for (const row of parseFirstTable(text).rows) {
    const key = row["항목"] || row["key"] || row["Key"] || Object.values(row)[0];
    const value = row["내용"] || row["value"] || row["Value"] || Object.values(row)[1];
    if (key) result.set(stripMarkdown(key), stripMarkdown(value));
  }
  return result;
}

/**
 * Markdown text에서 첫 번째 GFM table을 파싱한다.
 *
 * @param {string} text Markdown text.
 * @returns {{ headers: string[], rows: Record<string, string>[] }} table header와 row 목록.
 */
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

/**
 * Markdown table row 한 줄을 cell 배열로 나눈다.
 *
 * @param {string} line table row line.
 * @returns {string[]} cell 문자열 배열.
 */
function splitTableRow(line) {
  let value = line.trim();
  if (value.startsWith("|")) value = value.slice(1);
  if (value.endsWith("|")) value = value.slice(0, -1);
  return value.split("|").map((cell) => cell.trim());
}

/**
 * 한 줄이 Markdown table row인지 확인한다.
 *
 * @param {string} line 검사할 line.
 * @returns {boolean} table row이면 `true`.
 */
function isTableRow(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}

/**
 * 한 줄이 Markdown table separator row인지 확인한다.
 *
 * @param {string} line 검사할 line.
 * @returns {boolean} separator row이면 `true`.
 */
function isSeparatorRow(line) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

/**
 * H2 section 본문을 추출한다.
 *
 * @param {string} text Markdown text.
 * @param {string} heading 찾을 H2 제목.
 * @returns {string} section 본문 또는 빈 문자열.
 */
function section(text, heading) {
  return sectionByLevel(text, 2, heading);
}

/**
 * heading level과 관계없이 제목이 일치하는 첫 section 본문을 추출한다.
 *
 * @param {string} text Markdown text.
 * @param {string} heading 찾을 제목.
 * @returns {string} section 본문 또는 빈 문자열.
 */
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

/**
 * 특정 heading level과 제목이 일치하는 section 본문을 추출한다.
 *
 * @param {string} text Markdown text.
 * @param {number} level heading level.
 * @param {string} heading 찾을 제목.
 * @returns {string} section 본문 또는 빈 문자열.
 */
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

/**
 * Markdown text의 첫 heading을 plain text로 추출한다.
 *
 * @param {string} text Markdown text.
 * @returns {string} 첫 heading 또는 빈 문자열.
 */
function firstHeading(text) {
  const match = text.match(/^#{1,6}\s+(.+)$/m);
  return match ? stripMarkdown(match[1]) : "";
}

/**
 * table과 blockquote를 제외한 첫 문단을 추출한다.
 *
 * @param {string} text Markdown text.
 * @returns {string} plain text 첫 문단.
 */
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

/**
 * phase detail 본문에서 `owner_agent` bullet 값을 추출한다.
 *
 * @param {string} text phase detail 본문.
 * @returns {string} owner agent 값 또는 빈 문자열.
 */
function ownerAgentFromText(text) {
  const match = text.match(/^\s*-\s*owner_agent:\s*`?([^`\s]+)`?\s*$/m);
  return match ? match[1] : "";
}

/**
 * Markdown bullet list의 item text를 추출한다.
 *
 * @param {string} text Markdown text.
 * @returns {string[]} bullet item 목록.
 */
function listItems(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*[-*]\s+(.*)$/)?.[1] || "")
    .map(stripMarkdown)
    .filter((value) => value && !isNone(value));
}

/**
 * table cell 안의 목록형 값을 배열로 정규화한다.
 *
 * @param {string} value table cell 값.
 * @returns {string[]} 목록 값.
 */
function listFromCell(value) {
  const cleaned = stripMarkdown(value || "");
  if (!cleaned || isNone(cleaned)) return [];
  return cleaned
    .split(/\s*(?:<br\s*\/?>|;|ㆍ)\s*/i)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !isNone(item));
}

/**
 * table row의 선호 header 값을 사람이 읽기 쉬운 한 줄 요약으로 만든다.
 *
 * @param {Record<string, string>} row table row 객체.
 * @param {string[]} preferredHeaders 우선 사용할 header 목록.
 * @returns {string} row 요약.
 */
function tableRowSummary(row, preferredHeaders) {
  const parts = preferredHeaders
    .map((header) => [header, stripMarkdown(row[header] || "")])
    .filter(([, value]) => value && !isNone(value));
  if (!parts.length) {
    return Object.values(row).map(stripMarkdown).filter(Boolean).join(" / ");
  }
  return parts.map(([header, value]) => `${header}: ${value}`).join(" / ");
}

/**
 * 실행 흐름 row를 phase 진행 요약 문장으로 만든다.
 *
 * @param {Record<string, string>} row 실행 흐름 row.
 * @param {number} index row index.
 * @returns {string} phase 요약.
 */
function flowRowSummary(row, index) {
  const phase = row["Phase"] || row["단계"] || `단계 ${index + 1}`;
  const goal = row["목적"] || "";
  const done = row["완료 신호"] || "";
  return compactJoin([phase, compactJoin([goal, done], " -> ")], ": ");
}

/**
 * 값을 Markdown 제거 후 빈 값은 버리고 separator로 결합한다.
 *
 * @param {unknown[]} values 결합할 값 목록.
 * @param {string} separator separator 문자열.
 * @returns {string} 결합된 문자열.
 */
function compactJoin(values, separator) {
  return values.map(stripMarkdown).filter(Boolean).join(separator);
}

/**
 * `단계 1.` 같은 phase prefix를 제거한다.
 *
 * @param {string} value phase 제목 후보.
 * @returns {string} prefix가 제거된 제목.
 */
function stripPhasePrefix(value) {
  return stripMarkdown(value).replace(/^단계\s*\d+\.\s*/, "").trim();
}

/**
 * review-data에 넣기 위해 제한된 Markdown inline 문법을 plain text로 정리한다.
 *
 * @param {unknown} value Markdown 또는 text 값.
 * @returns {string} plain text.
 */
function stripMarkdown(value) {
  return String(value || "")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/<br\s*\/?>/gi, "; ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * `없음`, `none`, `n/a`처럼 의미상 빈 값을 확인한다.
 *
 * @param {unknown} value 검사할 값.
 * @returns {boolean} 의미상 빈 값이면 `true`.
 */
function isNone(value) {
  return /^(없음|none|null|n\/a|-)$/.test(String(value).trim().toLowerCase());
}

/**
 * 값이 문자열이면 그대로, 아니면 빈 문자열을 반환한다.
 *
 * @param {unknown} value 검사할 값.
 * @returns {string} 문자열 값 또는 빈 문자열.
 */
function stringValue(value) {
  return typeof value === "string" ? value : "";
}

/**
 * plan과 phase source text의 현재 내용을 대표하는 plan signature를 계산한다.
 *
 * @param {{ filePath: string, text: string }[]} inputs signature 입력 파일 목록.
 * @returns {string} 12자리 SHA-256 prefix.
 */
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

/**
 * 값을 배열로 정규화한다.
 *
 * @param {unknown} value 배열 또는 단일 값.
 * @returns {unknown[]} 배열 값.
 */
function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * review item signature 계산에서 순서와 volatile field 영향을 제거한다.
 *
 * @param {unknown} value 정규화할 값.
 * @returns {unknown} canonical value.
 */
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

/**
 * review item signature용 짧은 non-cryptographic hash를 만든다.
 *
 * @param {string} value hash 입력 문자열.
 * @returns {string} `rvw-` prefix가 붙은 signature.
 */
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

/**
 * review item signature에 공통으로 포함할 plan-level context를 추출한다.
 *
 * @param {object | null | undefined} model review-data model.
 * @returns {object} signature용 전역 context.
 */
function reviewGlobalContext(model) {
  const overview = model?.overview || {};
  return {
    task_slug: model?.task_slug || "",
    generator_contract_version: model?.generator_contract_version || 0,
    title: model?.title || "",
    review_outcome: model?.review_outcome || "",
    review_findings: asArray(model?.review_findings),
    overview_scope: {
      user_request: asArray(overview.user_request),
      included_scope: asArray(overview.included_scope),
      excluded_scope: asArray(overview.excluded_scope),
      change_shape: overview.change_shape || "",
      change_flow: asArray(overview.change_flow),
      major_changes: asArray(overview.major_changes),
      topology_contract: asArray(model?.topology_contract),
      evidence_artifacts: asArray(model?.evidence_artifacts)
    }
  };
}

/**
 * overview review item signature payload를 만든다.
 *
 * @param {object | null | undefined} model review-data model.
 * @returns {object} overview signature payload.
 */
function overviewSignaturePayload(model) {
  const overview = model?.overview || {};
  return {
    kind: "overview",
    id: "overview",
    generator_contract_version: model?.generator_contract_version || 0,
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
      ui_previews: asArray(overview.ui_previews),
      topology_contract: asArray(overview.topology_contract),
      evidence_artifacts: asArray(overview.evidence_artifacts)
    }
  };
}

/**
 * phase review item signature payload를 만든다.
 *
 * @param {object | null | undefined} model review-data model.
 * @param {object | null | undefined} phase phase model.
 * @param {number} index phase index.
 * @returns {object} phase signature payload.
 */
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
      ui_previews: asArray(phase?.ui_previews),
      topology_contract: asArray(phase?.topology_contract),
      evidence_artifacts: asArray(phase?.evidence_artifacts)
    }
  };
}

/**
 * signature payload를 canonical JSON으로 직렬화한 뒤 review item signature를 계산한다.
 *
 * @param {unknown} payload signature payload.
 * @returns {string} review item signature.
 */
function reviewItemSignatureFromPayload(payload) {
  return hashString(JSON.stringify(canonicalize(payload)));
}

/**
 * 현재 review-data와 기존 feedback을 합쳐 새 feedback.json 초기 상태를 만든다.
 *
 * 동일 item signature에 대한 기존 approval은 보존하고 stale approval은 해제한다.
 *
 * @param {object} reviewData 현재 review-data model.
 * @param {object | null} existingFeedback 기존 feedback.json 값.
 * @param {string} now 저장할 updated_at 시각.
 * @returns {object} v2 feedback model.
 */
function buildFeedback(reviewData, existingFeedback, now) {
  const reviewItems = currentReviewItems(reviewData);

  const feedback = {
    schema_version: 2,
    task_slug: reviewData.task_slug,
    plan_signature: reviewData.plan_signature,
    review_status: "in_progress",
    updated_at: now,
    comments: [],
    item_status: {}
  };

  for (const item of reviewItems) {
    const prior = priorApprovedItem(existingFeedback, item);
    if (prior) {
      const carriedFrom = prior.approved_against.plan_signature === reviewData.plan_signature
        ? prior.approved_against.carried_from_plan_signature || null
        : prior.approved_against.plan_signature || existingFeedback?.plan_signature || null;
      feedback.item_status[item.id] = {
        approved: true,
        approved_against: {
          plan_signature: reviewData.plan_signature,
          review_item_signature: item.review_item_signature,
          approved_at: prior.approved_against.approved_at || now,
          carried_from_plan_signature: carriedFrom === reviewData.plan_signature ? null : carriedFrom
        }
      };
    } else {
      feedback.item_status[item.id] = { approved: false };
    }
  }

  return feedback;
}

/**
 * 현재 review-data에서 approval 대상 item의 id/signature 목록을 추출한다.
 *
 * @param {object} reviewData 현재 review-data model.
 * @returns {{ id: string, review_item_signature: string }[]} review item 목록.
 */
function currentReviewItems(reviewData) {
  if (Array.isArray(reviewData.review_items) && reviewData.review_items.length) {
    return reviewData.review_items.map((item) => ({
      id: item.id,
      review_item_signature: item.review_item_signature
    }));
  }
  return [
    { id: "overview", review_item_signature: reviewData.overview.review_item_signature },
    ...reviewData.phases.map((phase, index) => ({
      id: phase.id || `P${index + 1}`,
      review_item_signature: phase.review_item_signature
    }))
  ];
}

/**
 * 기존 feedback에서 현재 item signature와 일치하는 prior approval을 찾는다.
 *
 * v2 `item_status`와 legacy `steps` schema를 모두 지원한다.
 *
 * @param {object | null} existingFeedback 기존 feedback 값.
 * @param {{ id: string, review_item_signature: string }} item 현재 review item.
 * @returns {{ approved_against: object } | null} 재사용 가능한 approval 또는 없으면 `null`.
 */
function priorApprovedItem(existingFeedback, item) {
  if (!existingFeedback || typeof existingFeedback !== "object") return null;
  const v2 = existingFeedback.item_status?.[item.id];
  if (v2?.approved === true && v2?.approved_against?.review_item_signature === item.review_item_signature) {
    return {
      approved_against: v2.approved_against
    };
  }
  const v1 = existingFeedback.steps?.[item.id];
  if (v1?.status === "approved" && v1?.approved_against?.review_item_signature === item.review_item_signature) {
    return {
      approved_against: v1.approved_against
    };
  }
  return null;
}

/**
 * review-history.json의 현재 plan signature를 갱신한다.
 *
 * 기존 round 기록은 같은 task slug일 때만 보존한다.
 *
 * @param {object} reviewData 현재 review-data model.
 * @param {object | null} existingHistory 기존 review-history 값.
 * @returns {object} 갱신된 review-history model.
 * @throws {Error} 기존 history의 task slug가 현재 task와 다를 때.
 */
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

/**
 * JSON 파일이 있으면 읽고 없으면 `null`을 반환한다.
 *
 * @param {string} filePath JSON 파일 경로.
 * @returns {object | null} 파싱된 JSON 또는 `null`.
 */
function readJsonIfPresent(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

/**
 * JSON 파일을 임시 파일에 쓴 뒤 rename으로 원자적으로 교체한다.
 *
 * @param {string} filePath 저장할 파일 경로.
 * @param {unknown} value 저장할 JSON 값.
 * @returns {void}
 */
function writeJsonAtomic(filePath, value) {
  ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, filePath);
}

/**
 * 디렉터리를 재귀적으로 생성한다.
 *
 * @param {string} dir 생성할 디렉터리.
 * @returns {void}
 */
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * 플랫폼 경로 separator를 POSIX slash로 바꾼다.
 *
 * @param {string} filePath 변환할 경로.
 * @returns {string} slash 기반 경로.
 */
function toPosix(filePath) {
  return String(filePath).split(path.sep).join("/");
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main();
}
