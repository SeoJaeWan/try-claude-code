# help-try 안내

`try-claude` 플러그인을 운영할 때 자주 나오는 질문을 정리한 FAQ입니다.

## 다루는 내용

- 플러그인 설치 후 첫 설정
- `init-try`와 `migration`의 역할
- 프로젝트별 레퍼런스를 어디서 수정해야 하는지
- MCP 설정 정책
- OS 의존 MCP 설정 가이드

## FAQ

### 1. 플러그인을 설치하면 바로 무엇이 생기나?

플러그인 자체에는 기본 자산만 들어 있습니다.

- `agents/`
- `skills/`
- `commands/`
- `references/`

이 시점에는 아직 소비자 저장소의 실제 운영 상태가 없습니다. 소비자 저장소에서
`init-try`를 실행해야 `.claude/try-claude/`가 생성됩니다.

### 2. `init-try`는 무엇을 만들까?

`init-try`는 소비자 저장소 안에 repo-local runtime을 만듭니다.

- `.claude/try-claude/project.json`
- `.claude/try-claude/references/`
- `.claude/try-claude/plans/`
- `.claude/try-claude/reports/`
- `.claude/try-claude/logs/`
- `.claude/try-claude/codemaps/`
- `.claude/try-claude/humanmaps/`
- `.claude/try-claude/jira-review/`

추가로 플러그인 기본 `references/**`를 소비자 저장소 런타임으로 시드하고,
`project.json`에 관리 대상 reference 메타데이터를 기록합니다.

### 3. 프로젝트에 맞는 설정은 어디서 수정해야 하나?

프로젝트별 커스터마이즈는 소비자 저장소의 아래 경로에서 해야 합니다.

- `.claude/try-claude/references/`

팀별 규칙이나 도메인 문서를 만들 목적이라면, 플러그인 설치 위치의 기본
`references/`를 직접 수정하지 않는 편이 맞습니다.

### 4. `migration`은 무엇을 업데이트하나?

`migration`은 현재 플러그인 기본값과 소비자 저장소 런타임을 비교해서 동기화합니다.

- 수정하지 않은 markdown section은 업데이트
- 사용자가 수정한 markdown section은 보존
- 플러그인에 새로 생긴 section은 추가
- 플러그인에 새로 생긴 reference 파일은 다시 시드
- 로컬 전용 파일이나 section은 자동 삭제하지 않음

### 5. 왜 일부 MCP 서버는 공유 `.mcp.json`에 넣지 않나?

일부 MCP 서버는 공유용 cross-platform 파일에 하드코딩하기에 적합하지 않기
때문입니다.

주된 이유는 이렇습니다.

- launcher가 OS에 따라 다름
- 실제 머신 로컬 경로가 필요함
- 로컬 자격 증명이나 환경변수가 필요함
- 모든 팀원이나 모든 프로젝트에 항상 필요한 것은 아님

### 6. 여기서 OS 의존 MCP는 무엇인가?

아래 항목은 공유 플러그인 기본값이 아니라 머신 로컬 설정으로 다루는 편이 낫습니다.

- `filesystem`
- `context7`
- `sequential-thinking`
- `playwright-test`
- `postgres`

이유:

- `filesystem`은 실제 프로젝트 절대 경로가 필요함
- `context7`, `sequential-thinking`은 `npx` 기반 stdio launcher임
- `playwright-test`는 로컬 브라우저/테스트 런타임에 의존함
- `postgres`는 `DATABASE_URL`에 의존함

### 7. 그럼 공유 `.mcp.json`에는 무엇을 남겨야 하나?

가능하면 OS 중립적인 HTTP endpoint나 공유 서비스만 남기는 편이 좋습니다.

- `github`
- `supabase`
- `atlassian-rovo`

이 항목들도 인증은 필요할 수 있지만, 공유 프로젝트 파일에서 OS별 프로세스
실행 래퍼를 직접 박아둘 필요는 없습니다.

### 8. OS 의존 MCP 설정은 어디에 두는 게 좋나?

권장 방식:

- 공유 프로젝트 설정: repo `.mcp.json`
- 머신 로컬 override: 사용자별 Claude 설정 파일 예: `~/.claude.json`

팀 차원에서 템플릿을 공유하고 싶다면, 공유 `.mcp.json`에 하드코딩하지 말고
이 문서나 온보딩 문서에 예시를 두는 편이 안전합니다.

## 로컬 MCP 템플릿

아래 예시는 머신 로컬 설정 파일에 복사해서 시작할 때 쓰는 템플릿입니다.

### Windows

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@anthropic/mcp-filesystem", "C:\\path\\to\\repo"]
    },
    "context7": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@anthropic/mcp-context7"]
    },
    "sequential-thinking": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@anthropic/mcp-sequential-thinking"]
    },
    "playwright-test": {
      "command": "cmd",
      "args": ["/c", "npx", "playwright", "run-test-mcp-server"]
    },
    "postgres": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}"
      }
    }
  }
}
```

### macOS / Linux

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-filesystem", "/path/to/repo"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-context7"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-sequential-thinking"]
    },
    "playwright-test": {
      "command": "npx",
      "args": ["playwright", "run-test-mcp-server"]
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}"
      }
    }
  }
}
```

## 공유 `.mcp.json` 정책

이 저장소는 체크인된 `.mcp.json`에 cross-platform하게 유지할 수 있는 공유 MCP만
둡니다.

로컬 stdio 서버가 필요하면 머신별 설정으로 분리해서 관리하는 편이 맞습니다.
