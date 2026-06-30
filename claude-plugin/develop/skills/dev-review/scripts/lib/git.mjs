import { spawnSync } from "node:child_process";

/**
 * `git -C <cwd> <args>` 를 동기 실행하고 spawnSync 결과를 반환한다.
 * 실패하면 기본적으로 예외를 던지며, allowFail=true 면 그대로 결과를 돌려준다.
 *
 * @param {string} cwd - git 명령을 실행할 디렉터리.
 * @param {string[]} args - git 서브커맨드 및 인자.
 * @param {{allowFail?: boolean}} [opts] - 실패 시 예외를 막을지 여부.
 * @returns {import("node:child_process").SpawnSyncReturns<string>}
 */
function run(cwd, args, { allowFail = false } = {}) {
  const result = spawnSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0 && !allowFail) {
    const err = new Error(
      `git ${args.join(" ")} failed (exit ${result.status}): ${result.stderr.trim()}`,
    );
    err.exitCode = 3;
    throw err;
  }
  return result;
}

/**
 * `git rev-parse HEAD` 를 실행해 현재 HEAD SHA 를 반환한다.
 *
 * @param {string} cwd - 작업 디렉터리.
 * @returns {string} 40자리 SHA.
 */
export function revParseHead(cwd) {
  return run(cwd, ["rev-parse", "HEAD"]).stdout.trim();
}

/**
 * 현재 체크아웃된 브랜치 이름을 반환한다. 디태치드 상태에서는 "HEAD" 가
 * 반환될 수 있다.
 *
 * @param {string} cwd - 작업 디렉터리.
 * @returns {string} 브랜치명.
 */
export function currentBranch(cwd) {
  return run(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]).stdout.trim();
}

/**
 * 주어진 ref 의 SHA 를 조용히 조회한다. 존재하지 않으면 null 을 반환한다.
 *
 * @param {string} cwd - 작업 디렉터리.
 * @param {string} ref - 조회할 ref(브랜치명·태그·SHA 등).
 * @returns {string|null} SHA 문자열 또는 null.
 */
export function revParseSilent(cwd, ref) {
  const result = run(cwd, ["rev-parse", "--verify", ref], { allowFail: true });
  return result.status === 0 ? result.stdout.trim() : null;
}

const NUL = "\x1F";

/**
 * `base..head` 범위의 커밋들을 시간순(--reverse)으로 나열한다. 각 커밋은
 * sha/subject/body/author/email/timestamp 필드를 가진 객체로 반환된다.
 * 구분자에 제어 문자를 사용해 메시지 본문에 줄바꿈/특수문자가 있어도
 * 안전하게 파싱한다.
 *
 * @param {string} cwd - 작업 디렉터리.
 * @param {string} base - 베이스 ref(이 ref 의 다음 커밋부터 포함).
 * @param {string} head - 헤드 ref.
 * @returns {Array<{sha: string, subject: string, body: string, author: string, authorEmail: string, timestamp: string}>}
 */
export function listCommits(cwd, base, head) {
  const fmt = ["%H", "%s", "%b", "%an", "%ae", "%aI"].join(NUL);
  const sep = "\x1EEND_OF_COMMIT\x1E";
  const result = run(cwd, [
    "log",
    "--reverse",
    `--format=${fmt}${sep}`,
    `${base}..${head}`,
  ]);
  const out = result.stdout;
  if (!out.trim()) return [];
  return out
    .split(sep)
    .map((chunk) => chunk.replace(/^\n+/, ""))
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => {
      const [sha, subject, body, author, email, iso] = chunk.split(NUL);
      return {
        sha: (sha || "").trim(),
        subject: subject || "",
        body: (body || "").trim(),
        author: author || "",
        authorEmail: email || "",
        timestamp: iso || "",
      };
    })
    .filter((commit) => commit.sha.length === 40);
}

/**
 * 커밋의 부모 SHA 를 반환한다. 루트 커밋(부모 없음)인 경우 git의 빈 트리
 * 객체 SHA 를 반환해 diff 계산이 가능하도록 한다.
 *
 * @param {string} cwd - 작업 디렉터리.
 * @param {string} sha - 부모를 찾을 커밋 SHA.
 * @returns {string} 부모 SHA 또는 빈 트리 SHA.
 */
export function commitParent(cwd, sha) {
  const result = run(cwd, ["rev-parse", `${sha}^`], { allowFail: true });
  if (result.status === 0) return result.stdout.trim();
  // 루트 커밋 — diff 가 동작하도록 빈 트리와 비교한다.
  return "4b825dc642cb6eb9a060e54bf899d15006ef9a21";
}

/**
 * 한 커밋의 `--numstat` 결과를 파싱해 파일별 추가/삭제 라인 수 목록을 반환한다.
 * 바이너리 파일은 additions/deletions=0, rawAdditions=rawDeletions="-" 로
 * 표시된다.
 *
 * @param {string} cwd - 작업 디렉터리.
 * @param {string} sha - 대상 커밋 SHA.
 * @returns {Array<{additions: number, deletions: number, rawPath: string, rawAdditions: string, rawDeletions: string}>}
 */
export function commitNumstat(cwd, sha) {
  const result = run(cwd, ["show", "--format=", "--numstat", sha]);
  const lines = result.stdout.split(/\r?\n/).filter(Boolean);
  const entries = [];
  for (const line of lines) {
    const parts = line.split("\t");
    if (parts.length < 3) continue;
    const [addRaw, delRaw, pathRaw] = parts;
    const additions = addRaw === "-" ? 0 : Number.parseInt(addRaw, 10) || 0;
    const deletions = delRaw === "-" ? 0 : Number.parseInt(delRaw, 10) || 0;
    entries.push({
      additions,
      deletions,
      rawPath: pathRaw,
      rawAdditions: addRaw,
      rawDeletions: delRaw,
    });
  }
  return entries;
}

/**
 * 한 커밋의 `--name-status` 결과를 파싱해 파일별 변경 종류(added/modified/
 * deleted/renamed)를 분류한다. 이름 변경/복사(R/C)는 oldPath 도 포함한다.
 *
 * @param {string} cwd - 작업 디렉터리.
 * @param {string} sha - 대상 커밋 SHA.
 * @returns {Array<{kind: string, path: string, oldPath?: string}>}
 */
export function commitNameStatus(cwd, sha) {
  const result = run(cwd, ["show", "--format=", "--name-status", sha]);
  const lines = result.stdout.split(/\r?\n/).filter(Boolean);
  const entries = [];
  for (const line of lines) {
    const parts = line.split("\t");
    const code = parts[0];
    if (!code) continue;
    if (code.startsWith("R") || code.startsWith("C")) {
      entries.push({ kind: "renamed", oldPath: parts[1], path: parts[2] });
    } else if (code === "A") {
      entries.push({ kind: "added", path: parts[1] });
    } else if (code === "M") {
      entries.push({ kind: "modified", path: parts[1] });
    } else if (code === "D") {
      entries.push({ kind: "deleted", path: parts[1] });
    } else {
      entries.push({ kind: "modified", path: parts[1] });
    }
  }
  return entries;
}

/**
 * `git diff parent..sha` 의 unified diff 텍스트를 그대로 반환한다.
 *
 * @param {string} cwd - 작업 디렉터리.
 * @param {string} parent - 부모 ref.
 * @param {string} sha - 대상 커밋 SHA.
 * @returns {string} unified diff 텍스트.
 */
export function commitDiff(cwd, parent, sha) {
  return run(cwd, ["diff", `${parent}..${sha}`]).stdout;
}

/**
 * `git diff --name-status base..head` 결과를 변경 종류 객체 배열로 반환한다.
 *
 * @param {string} cwd - 작업 디렉터리.
 * @param {string} base - 베이스 ref.
 * @param {string} head - 헤드 ref.
 * @returns {Array<{kind: string, path: string, oldPath?: string}>}
 */
export function rangeNameStatus(cwd, base, head) {
  const result = run(cwd, ["diff", "--name-status", `${base}..${head}`]);
  const lines = result.stdout.split(/\r?\n/).filter(Boolean);
  return lines.map((line) => {
    const parts = line.split("\t");
    const code = parts[0];
    if (code.startsWith("R") || code.startsWith("C")) {
      return { kind: "renamed", path: parts[2], oldPath: parts[1] };
    }
    const mapping = { A: "added", M: "modified", D: "deleted" };
    return { kind: mapping[code] || "modified", path: parts[1] };
  });
}

/**
 * `git diff --numstat base..head` 결과를 파일별 numstat 객체 배열로 반환한다.
 *
 * @param {string} cwd - 작업 디렉터리.
 * @param {string} base - 베이스 ref.
 * @param {string} head - 헤드 ref.
 * @returns {Array<{additions: number, deletions: number, path: string}>}
 */
export function rangeNumstat(cwd, base, head) {
  const result = run(cwd, ["diff", "--numstat", `${base}..${head}`]);
  const lines = result.stdout.split(/\r?\n/).filter(Boolean);
  return lines.map((line) => {
    const [addRaw, delRaw, pathRaw] = line.split("\t");
    return {
      additions: addRaw === "-" ? 0 : Number.parseInt(addRaw, 10) || 0,
      deletions: delRaw === "-" ? 0 : Number.parseInt(delRaw, 10) || 0,
      path: pathRaw,
    };
  });
}

/**
 * 특정 ref 시점의 파일 내용을 반환한다. 존재하지 않으면 null.
 *
 * @param {string} cwd - 작업 디렉터리.
 * @param {string} ref - 조회할 ref.
 * @param {string} path - 워크트리 기준 파일 경로.
 * @returns {string|null} 파일 내용 또는 null.
 */
export function fileContentAt(cwd, ref, path) {
  const result = run(cwd, ["show", `${ref}:${path}`], { allowFail: true });
  if (result.status !== 0) return null;
  return result.stdout;
}
