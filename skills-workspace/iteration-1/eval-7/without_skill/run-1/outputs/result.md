# try-claude 초기화 시뮬레이션 결과

## "try-claude 초기화"란?

이 프로젝트는 **try-claude-code**라는 Claude Code 워크플로우 플러그인입니다. "try-claude 초기화"는 이 플러그인이 대상 리포지토리에 런타임 상태를 부트스트랩하는 과정을 의미합니다. 구체적으로는 `.claude/try-claude/` 디렉토리 아래에 필요한 폴더 구조와 참조 파일들을 생성/동기화하는 작업입니다.

## 시뮬레이션: 수행되는 작업

### 1단계: 런타임 디렉토리 생성

다음 디렉토리들이 `.claude/try-claude/` 아래에 생성됩니다:

- `.claude/try-claude/references/`
- `.claude/try-claude/plans/`
- `.claude/try-claude/reports/`
- `.claude/try-claude/logs/`
- `.claude/try-claude/codemaps/`
- `.claude/try-claude/humanmaps/`

### 2단계: 참조 파일 시딩(Seeding)

플러그인의 `references/` 디렉토리에 있는 파일들이 `.claude/try-claude/references/`로 복사됩니다. 이미 존재하는 파일은 유지되고, 누락된 파일만 새로 생성됩니다.

대상 참조 파일 목록 (15개):

| 카테고리 | 파일 |
|---------|------|
| coding-rules | code-style.md, comments.md, completion.md, folder-structure.md, git.md, naming.md, package-manager.md, testing.md, typescript.md |
| design | components.md, font.md, pages.md, references.md, theme-tokens.md |
| (root) | sample-domain.md |

### 3단계: project.json 생성

`.claude/try-claude/project.json` 파일이 생성/업데이트됩니다. 이 파일에는 다음 정보가 포함됩니다:

- `schemaVersion`: "1.0.0"
- `pluginId`: "try-claude" (plugin.json의 name에서 파생)
- `pluginVersion`: "0.1.0"
- `lastSyncedAt`: 현재 ISO 타임스탬프
- `managedReferences`: 각 참조 파일의 해시, 머지 모드(whole-file 또는 markdown-sections), 섹션별 해시 정보

### 4단계: 관리 참조 추적

마크다운 파일 중 고유한 `##` 헤딩을 가진 파일은 `markdown-sections` 머지 모드로, 그렇지 않은 파일은 `whole-file` 모드로 추적됩니다. 이를 통해 이후 플러그인 업데이트 시 사용자 수정 사항을 보존하면서 새 섹션만 병합할 수 있습니다.

## 실행 방법 (실제 초기화 시)

```bash
node skills/init-try/scripts/run.mjs --repo-root <대상-리포지토리-경로>
```

## 현재 상태

이 프로젝트에는 이미 `.claude/try-claude/` 런타임이 초기화되어 있습니다:

- **project.json**: 존재함 (pluginId: "try-claude", version: "0.1.0")
- **lastSyncedAt**: 2026-03-06T14:10:45.567Z
- **관리 참조 파일 수**: 15개
- **런타임 디렉토리**: codemaps, humanmaps, jira-review, logs, plans, references, reports 모두 존재

따라서 현재 시점에서 초기화를 다시 실행하면 새로 시딩되는 파일은 0개이고, 기존 15개 참조 파일이 모두 유지(kept)됩니다. project.json의 `lastSyncedAt` 타임스탬프만 갱신됩니다.

## 예상 출력 (JSON 요약)

```json
{
  "status": "ok",
  "runtimeRoot": "<repo-root>/.claude/try-claude",
  "seededCount": 0,
  "keptCount": 15,
  "trackedCount": 15,
  "projectJsonPath": "<repo-root>/.claude/try-claude/project.json",
  "seeded": [],
  "kept": [
    "references/coding-rules/code-style.md",
    "references/coding-rules/comments.md",
    "references/coding-rules/completion.md",
    "references/coding-rules/folder-structure.md",
    "references/coding-rules/git.md",
    "references/coding-rules/naming.md",
    "references/coding-rules/package-manager.md",
    "references/coding-rules/testing.md",
    "references/coding-rules/typescript.md",
    "references/design/components.md",
    "references/design/font.md",
    "references/design/pages.md",
    "references/design/references.md",
    "references/design/theme-tokens.md",
    "references/sample-domain.md"
  ]
}
```
