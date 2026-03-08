# init-try 스킬 평가 (Korean prompt, with_skill)

## 읽은 스킬: skills/init-try/SKILL.md

## 실행 단계
1. `node skills/init-try/scripts/run.mjs --repo-root <repo-root>` 실행
2. 런타임 디렉토리 생성, 레퍼런스 파일 시딩, SHA256 해시 생성, project.json 작성

## 생성될 파일/디렉토리
- `.claude/try-claude/` 하위 디렉토리:
  - `references/` (coding-rules 9개 문서 + design 5개 문서 = 24개 레퍼런스)
  - `plans/`, `reports/`, `logs/`, `codemaps/`, `humanmaps/`, `jira-review/`
- `scripts/generate.mjs` (코드 생성기)
- `project.json` (managedReferences 배열 포함)

## project.json 구조
- schemaVersion, pluginId, pluginVersion, lastSyncedAt
- managedReferences[]: path, hash(SHA256), mergeMode(markdown-sections/whole-file), sectionHashes

## SHA256 해시 추적
- \r\n 정규화 후 해시 계산
- markdown 파일: section-level tracking (## 헤딩 기준)
- 기타 파일: whole-file tracking
