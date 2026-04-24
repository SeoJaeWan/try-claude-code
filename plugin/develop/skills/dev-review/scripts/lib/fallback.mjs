import { fileContentAt } from "./git.mjs";

const TEST_RE = /(^|\/)(tests?|__tests__|spec)\/|\.(test|spec)\.[a-z]+$/i;

export function buildFallbackCards(commit, worktreePath) {
  const cards = [];

  const primary = buildPrimaryCard(commit);
  cards.push(primary);

  const supplementary = [];
  for (const file of commit.files_changed) {
    if (supplementary.length >= 3) break;

    if (TEST_RE.test(file.path)) {
      supplementary.push(testCardFor(commit, file, worktreePath));
      continue;
    }

    if (file.kind === "added" && (file.additions || 0) >= 50) {
      supplementary.push(addedFileCardFor(commit, file, worktreePath));
    }
  }

  return [primary, ...supplementary].map((card, idx) => ({
    ...card,
    id: `${commit.short_sha}.C${idx + 1}`,
  }));
}

function buildPrimaryCard(commit) {
  const fileCount = commit.files_changed.length;
  const addTotal = commit.additions || 0;
  const delTotal = commit.deletions || 0;
  return {
    title: `이 commit은 ${fileCount}개 파일을 수정했습니다 (+${addTotal}/-${delTotal})`,
    description: "자동 생성된 요약입니다. 파일 변경 목록과 전체 diff를 참고하세요.",
    fallback: true,
    evidence: [],
  };
}

function testCardFor(commit, file, worktreePath) {
  const snippet = sliceFile(worktreePath, commit.sha, file.path, 20);
  return {
    title: `테스트 변경: ${file.path}`,
    description: `테스트 파일이 수정되었습니다 (+${file.additions || 0}/-${file.deletions || 0}).`,
    fallback: true,
    evidence: snippet
      ? [{ file: file.path, lines: `1-${snippet.split(/\r?\n/).length}`, snippet }]
      : [],
  };
}

function addedFileCardFor(commit, file, worktreePath) {
  const snippet = sliceFile(worktreePath, commit.sha, file.path, 30);
  return {
    title: `새 파일: ${file.path}`,
    description: `${file.additions || 0}줄 규모의 새 파일이 추가되었습니다.`,
    fallback: true,
    evidence: snippet
      ? [{ file: file.path, lines: `1-${snippet.split(/\r?\n/).length}`, snippet }]
      : [],
  };
}

function sliceFile(worktreePath, sha, filePath, limit) {
  const content = fileContentAt(worktreePath, sha, filePath);
  if (content == null) return "";
  return content.split(/\r?\n/).slice(0, limit).join("\n");
}
