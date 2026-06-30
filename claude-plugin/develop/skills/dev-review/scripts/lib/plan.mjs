import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const BRANCH_RE = /^\s*\*\*Branch:\*\*\s*`?([^\s`]+)`?\s*$/m;
const PHASE_INDEX_HEADER = /^\|\s*#\s*\|\s*Phase\s*\|\s*Agent/i;
const PHASE_ROW = /^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/;

// v2 에서는 plan_signature 계산을 위해서만 plan 파일을 읽는다.
// user_request / plan_summary / major_changes 를 소비하던 해석 에이전트가
// 사라졌으므로 반환 객체에도 해당 필드는 없다.

/**
 * plan 파일과 그 phases/ 산하 파일들을 읽어 branch 이름과 plan_signature
 * 해시를 계산한다. plan_signature 는 plan 본문 + 모든 phase 파일의 내용을
 * 정렬해 SHA-256 으로 해싱한 12자 hex 값이며, dev-review 가 round 식별에
 * 사용한다.
 *
 * @param {string} planPath - plan 파일 절대 경로.
 * @returns {{planPath: string, planDir: string, branch: string|null, planSignature: string}}
 */
export function readPlan(planPath) {
  const planText = fs.readFileSync(planPath, "utf8");
  const planDir = path.dirname(planPath);

  const branchMatch = planText.match(BRANCH_RE);
  const branch = branchMatch ? branchMatch[1] : null;

  const phases = parsePhaseIndex(planText, planDir);
  const phaseFiles = phases
    .map((p) => p.filePath)
    .filter((p) => p && fs.existsSync(p));

  const signatureInputs = [
    { path: planPath, text: planText },
    ...phaseFiles.map((p) => ({ path: p, text: fs.readFileSync(p, "utf8") })),
  ];

  return {
    planPath,
    planDir,
    branch,
    planSignature: computeSignature(signatureInputs),
  };
}

/**
 * plan 본문의 Phase 인덱스 테이블을 파싱해 각 phase 번호와 매칭되는
 * `phases/NN-*.md` 파일 경로를 찾아낸다.
 *
 * @param {string} text - plan 파일 텍스트.
 * @param {string} planDir - plan 파일이 있는 디렉터리(phases/ 의 부모).
 * @returns {Array<{number: number, filePath: string|null}>}
 */
function parsePhaseIndex(text, planDir) {
  const lines = text.split(/\r?\n/);
  let inTable = false;
  let skippedSep = false;
  const phases = [];
  for (const line of lines) {
    if (!inTable) {
      if (PHASE_INDEX_HEADER.test(line)) {
        inTable = true;
        skippedSep = false;
      }
      continue;
    }
    if (!skippedSep && /^\|\s*[-: ]+\s*\|/.test(line)) {
      skippedSep = true;
      continue;
    }
    if (!line.trim().startsWith("|")) break;
    const match = line.match(PHASE_ROW);
    if (!match) break;
    phases.push({ number: Number.parseInt(match[1], 10) });
  }

  for (const phase of phases) {
    const pad = String(phase.number).padStart(2, "0");
    const dir = path.join(planDir, "phases");
    let filePath = null;
    try {
      const entries = fs.readdirSync(dir);
      const match = entries.find((e) => e.startsWith(`${pad}-`) && e.endsWith(".md"));
      if (match) filePath = path.join(dir, match);
    } catch {
      filePath = null;
    }
    phase.filePath = filePath;
  }
  return phases;
}

/**
 * plan 파일과 phase 파일들의 내용 전체를 정렬·결합해 SHA-256 해시 12자를
 * 반환한다. 같은 plan 내용에서 항상 같은 해시가 나오도록 path 기준 정렬한다.
 *
 * @param {Array<{path: string, text: string}>} inputs - 해싱할 입력 목록.
 * @returns {string} 12자리 hex 해시.
 */
function computeSignature(inputs) {
  const hash = crypto.createHash("sha256");
  for (const input of [...inputs].sort((a, b) => a.path.localeCompare(b.path))) {
    hash.update(input.path);
    hash.update(" ");
    hash.update(input.text ?? "");
    hash.update("");
  }
  return hash.digest("hex").slice(0, 12);
}
