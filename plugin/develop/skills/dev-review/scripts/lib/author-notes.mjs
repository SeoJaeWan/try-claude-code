// 작성 agent 가 남긴 "왜 이렇게 했는지" 근거 노트를 결정적으로 해석하는 모듈.
//
// 작성 agent(plan-dispatch / rework-dispatch)는 커밋 직후 라인 번호 대신
// **코드 스니펫**으로 앵커링한 입력 노트를
// `{data-root}/author-notes-input/{short_sha}.json` 에 기록한다. 생성기는
// 그 커밋의 unified diff 를 파싱해 스니펫을 new-side 라인 번호로 환산하고,
// UI 가 바로 렌더할 수 있는 `author-notes.json` 을 만든다.
//
// 라인 번호 해석을 생성기 쪽에 둔 이유: 작성 agent 가 라인 번호를 직접 세면
// 이후 커밋이 라인을 밀 때 앵커가 깨진다. 스니펫은 그 커밋의 diff 안에서만
// 의미를 가지므로(커밋은 불변) 라운드가 바뀌어도 안정적이다.

import fs from "node:fs";
import path from "node:path";

const SHORT_SHA_LEN = 7;
const SCHEMA_VERSION = 1;

// 작성 agent 가 붙일 수 있는 카테고리. UI 가 배지/강조에 사용한다. 목록 밖의
// 값도 막지는 않되(노트를 버리지 않음) warn 으로 남긴다.
export const AUTHOR_NOTE_CATEGORIES = [
  "핵심 로직",
  "리뷰 요청",
  "트레이드오프/우회",
  "phase 핵심",
];

/**
 * unified diff 텍스트를 파싱해 파일별 new-side 라인 목록을 만든다. new-side
 * 라인이란 추가(`+`)·문맥(` `) 라인을 말하며, 각 항목은 diff2html 이 UI 에서
 * 부여하는 new 라인 번호와 동일한 번호를 가진다(같은 hunk 헤더에서 같은
 * 규칙으로 증가시키므로 일치한다).
 *
 * @param {string} diffText - 한 커밋의 전체 unified diff.
 * @returns {Map<string, Array<{line: number, content: string}>>} new-side path → 라인 목록.
 */
export function parseDiffNewSideLines(diffText) {
  const byFile = new Map();
  if (!diffText) return byFile;

  const lines = diffText.split(/\r?\n/);
  let currentFile = null;
  let newLineNo = 0;
  let inHunk = false;

  for (const raw of lines) {
    // 새 파일 섹션 시작. 파일 경로는 `+++ b/<path>` 에서 취한다.
    if (raw.startsWith("diff --git ")) {
      currentFile = null;
      inHunk = false;
      continue;
    }
    if (raw.startsWith("--- ")) continue;
    if (raw.startsWith("+++ ")) {
      const target = raw.slice(4).trim();
      currentFile = target === "/dev/null" ? null : stripDiffPathPrefix(target);
      if (currentFile && !byFile.has(currentFile)) byFile.set(currentFile, []);
      inHunk = false;
      continue;
    }

    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
    if (hunk) {
      newLineNo = Number.parseInt(hunk[1], 10);
      inHunk = true;
      continue;
    }

    if (!inHunk || !currentFile) continue;

    // diff 본문. `+`/문맥은 new-side 카운터를 증가시키고, `-`는 old 전용.
    if (raw.startsWith("+")) {
      byFile.get(currentFile).push({ line: newLineNo, content: raw.slice(1) });
      newLineNo += 1;
    } else if (raw.startsWith("-")) {
      // old 전용 — new 카운터 그대로.
    } else if (raw.startsWith("\\")) {
      // "\ No newline at end of file" — 무시.
    } else {
      // 문맥 라인(맨 앞 공백 1칸). 빈 문자열도 문맥으로 취급.
      byFile.get(currentFile).push({ line: newLineNo, content: raw.slice(1) });
      newLineNo += 1;
    }
  }

  return byFile;
}

/**
 * diff 헤더 경로(`a/...`, `b/...`, 따옴표 감싼 경로)에서 실제 repo 상대 경로를
 * 뽑는다.
 *
 * @param {string} p - diff 헤더의 경로 토큰.
 * @returns {string} 정규화된 경로.
 */
function stripDiffPathPrefix(p) {
  let s = p;
  // git 은 공백/특수문자가 있으면 경로를 따옴표로 감싼다.
  if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1);
  if (s.startsWith("a/") || s.startsWith("b/")) s = s.slice(2);
  return s;
}

/**
 * 한 파일의 new-side 라인 목록에서 스니펫을 포함하는 N번째 라인을 찾는다.
 * 비교는 양쪽을 trim 한 substring 매칭이라 들여쓰기 차이에 관대하다.
 *
 * @param {Array<{line: number, content: string}>} newSideLines - 파일 라인 목록.
 * @param {string} snippet - 찾을 코드 스니펫.
 * @param {number} occurrence - 1-based 등장 순번(기본 1).
 * @returns {number|null} new-side 라인 번호 또는 null.
 */
export function resolveSnippetLine(newSideLines, snippet, occurrence = 1) {
  if (!Array.isArray(newSideLines) || !snippet) return null;
  const needle = String(snippet).trim();
  if (!needle) return null;
  const want = Number.isInteger(occurrence) && occurrence > 0 ? occurrence : 1;

  let seen = 0;
  for (const entry of newSideLines) {
    if (entry.content.trim().includes(needle)) {
      seen += 1;
      if (seen === want) return entry.line;
    }
  }
  return null;
}

/**
 * author-notes-input 디렉터리의 입력 노트들을 읽고, 각 노트를 그 커밋의 diff
 * 안에서 new-side 라인으로 해석해 UI 용 author-notes.json 객체를 만든다.
 *
 * 해석 실패(커밋 부재·파일 부재·스니펫 미발견)는 치명적이지 않다 — 해당 노트만
 * warn 으로 건너뛰고 나머지는 계속 처리한다. 이는 헬퍼의 graceful 원칙과
 * 일치한다(노트는 보조 레이어이므로 review-data 생성을 막지 않는다).
 *
 * @param {object} opts
 * @param {string} opts.inputDir - author-notes-input 절대 경로.
 * @param {Array<object>} opts.commits - review-data 의 commits[](sha/short_sha/files_changed).
 * @param {Map<string, string>} opts.diffTextBySha - full sha → 그 커밋의 unified diff 텍스트.
 * @param {string} opts.taskSlug
 * @param {string} opts.taskHeadSha
 * @param {string} opts.planSignature
 * @param {string} opts.generatedAt - ISO8601.
 * @param {{warn: Function, info: Function, debug: Function}} opts.logger
 * @returns {{schema_version: number, task_slug: string, task_head_sha: string, plan_signature: string, generated_at: string, notes: Array<object>}}
 */
export function buildAuthorNotes(opts) {
  const {
    inputDir,
    commits,
    diffTextBySha,
    taskSlug,
    taskHeadSha,
    planSignature,
    generatedAt,
    logger,
  } = opts;

  const notes = [];
  const commitBySha = new Map(commits.map((c) => [c.sha, c]));
  const newSideCache = new Map(); // sha → Map(file → lines)

  const inputs = readInputNotes(inputDir, logger);
  for (const input of inputs) {
    const commit = resolveInputCommit(input, commitBySha, logger);
    if (!commit) continue;

    if (!newSideCache.has(commit.sha)) {
      newSideCache.set(commit.sha, parseDiffNewSideLines(diffTextBySha.get(commit.sha) || ""));
    }
    const newSideByFile = newSideCache.get(commit.sha);

    let idx = 0;
    for (const note of Array.isArray(input.notes) ? input.notes : []) {
      idx += 1;
      const resolved = resolveOneNote({
        note,
        commit,
        newSideByFile,
        index: idx,
        logger,
      });
      if (resolved) notes.push(resolved);
    }
  }

  // 결정적 정렬: 커밋 순서(short_sha) → 파일 → 라인.
  const commitOrder = new Map(commits.map((c, i) => [c.short_sha, i]));
  notes.sort((a, b) => {
    const ca = commitOrder.get(a.short_sha) ?? 0;
    const cb = commitOrder.get(b.short_sha) ?? 0;
    if (ca !== cb) return ca - cb;
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    return a.line_start - b.line_start;
  });

  return {
    schema_version: SCHEMA_VERSION,
    task_slug: taskSlug,
    task_head_sha: taskHeadSha,
    plan_signature: planSignature,
    generated_at: generatedAt,
    notes,
  };
}

/**
 * author-notes-input 디렉터리의 `*.json` 파일들을 읽어 파싱한다. 디렉터리가
 * 없으면 빈 배열. 개별 파일 파싱 실패는 warn 후 건너뛴다.
 *
 * @param {string} inputDir - 입력 디렉터리 절대 경로.
 * @param {{warn: Function}} logger
 * @returns {Array<object>} 파싱된 입력 노트 파일들.
 */
function readInputNotes(inputDir, logger) {
  if (!inputDir || !fs.existsSync(inputDir)) return [];
  let entries;
  try {
    entries = fs.readdirSync(inputDir);
  } catch (err) {
    logger.warn(`author-notes: cannot read input dir ${inputDir}: ${err.message}`);
    return [];
  }
  const out = [];
  for (const name of entries.sort()) {
    if (!name.endsWith(".json")) continue;
    const abs = path.join(inputDir, name);
    try {
      out.push(JSON.parse(fs.readFileSync(abs, "utf8")));
    } catch (err) {
      logger.warn(`author-notes: skipping unparsable input ${name}: ${err.message}`);
    }
  }
  return out;
}

/**
 * 입력 노트 파일의 commit_sha 를 현재 라운드 커밋으로 해석한다. full sha 우선,
 * 없으면 short_sha prefix 매칭도 허용한다. 매칭 안 되면 null(warn).
 *
 * @param {object} input - 입력 노트 파일.
 * @param {Map<string, object>} commitBySha - full sha → commit.
 * @param {{warn: Function}} logger
 * @returns {object|null} 커밋 객체 또는 null.
 */
function resolveInputCommit(input, commitBySha, logger) {
  const sha = typeof input.commit_sha === "string" ? input.commit_sha : "";
  if (commitBySha.has(sha)) return commitBySha.get(sha);
  if (sha.length >= SHORT_SHA_LEN) {
    for (const [full, commit] of commitBySha) {
      if (full.startsWith(sha)) return commit;
    }
  }
  // 현재 라운드 범위에 없는 커밋(예: rebase 로 사라짐) — 조용히 건너뛴다.
  logger.warn(`author-notes: input commit ${sha || "(none)"} not in range, skipping`);
  return null;
}

/**
 * 입력 노트 하나를 해석해 UI 용 노트 객체로 변환한다. 파일이 그 커밋의
 * files_changed 에 없거나 스니펫을 찾지 못하면 null(warn).
 *
 * @param {object} args
 * @param {object} args.note - 입력 노트({file, anchor, occurrence?, category, body}).
 * @param {object} args.commit - 대상 커밋.
 * @param {Map<string, Array>} args.newSideByFile - 파일 → new-side 라인 목록.
 * @param {number} args.index - 커밋 내 노트 순번(id 생성용).
 * @param {{warn: Function}} args.logger
 * @returns {object|null} 해석된 노트 또는 null.
 */
function resolveOneNote({ note, commit, newSideByFile, index, logger }) {
  const where = `${commit.short_sha}#${index}`;
  if (!note || typeof note !== "object") {
    logger.warn(`author-notes: ${where} malformed note, skipping`);
    return null;
  }
  const file = typeof note.file === "string" ? note.file : "";
  const anchor = typeof note.anchor === "string" ? note.anchor : "";
  const body = typeof note.body === "string" ? note.body : "";
  if (!file || !anchor || !body) {
    logger.warn(`author-notes: ${where} missing file/anchor/body, skipping`);
    return null;
  }

  // 파일은 그 커밋이 실제로 건드린 파일이어야 한다(UI 앵커가 files_changed
  // 경로 기준으로 매칭되므로).
  const inCommit = (commit.files_changed || []).some((f) => f.path === file);
  if (!inCommit) {
    logger.warn(`author-notes: ${where} file ${file} not in commit files, skipping`);
    return null;
  }

  const newSideLines = newSideByFile.get(file);
  if (!newSideLines || newSideLines.length === 0) {
    logger.warn(`author-notes: ${where} no new-side lines for ${file}, skipping`);
    return null;
  }

  const line = resolveSnippetLine(newSideLines, anchor, note.occurrence);
  if (line === null) {
    logger.warn(`author-notes: ${where} anchor not found in ${file}: ${truncate(anchor)}`);
    return null;
  }

  const category = normalizeCategory(note.category, where, logger);

  return {
    id: `ai_${commit.short_sha}_${index}`,
    commit_sha: commit.sha,
    short_sha: commit.short_sha,
    file,
    side: "new",
    line_start: line,
    line_end: line,
    category,
    body,
  };
}

/**
 * 카테고리를 알려진 목록으로 정규화한다. 목록 밖이면 그대로 두되 warn 한다
 * (노트를 버리지 않는다 — 분류보다 근거 자체가 더 중요하므로).
 *
 * @param {*} raw - 입력 카테고리.
 * @param {string} where - 로그용 위치 식별자.
 * @param {{warn: Function}} logger
 * @returns {string} 정규화된 카테고리.
 */
function normalizeCategory(raw, where, logger) {
  const c = typeof raw === "string" ? raw.trim() : "";
  if (!c) return "핵심 로직";
  if (!AUTHOR_NOTE_CATEGORIES.includes(c)) {
    logger.warn(`author-notes: ${where} unknown category "${c}", keeping as-is`);
  }
  return c;
}

/**
 * 로그 메시지용으로 긴 문자열을 자른다.
 *
 * @param {string} s
 * @returns {string}
 */
function truncate(s) {
  const str = String(s);
  return str.length > 60 ? `${str.slice(0, 57)}...` : str;
}
