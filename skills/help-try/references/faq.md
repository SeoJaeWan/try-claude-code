# help-try 안내

`try-claude` 플러그인을 운영할 때 자주 나오는 질문을 정리한 FAQ입니다.

## 다루는 내용

- 플러그인 구조와 경로
- 프로젝트별 레퍼런스를 어디서 수정해야 하는지
- MCP 설정 정책
- OS 의존 MCP 설정 가이드

## FAQ

### 1. 플러그인 구조는 어떻게 되어 있나?

플러그인은 다음과 같은 디렉터리로 구성됩니다.

- `agents/` - 에이전트 정의
- `skills/` - 스킬 워크플로우
- `commands/` - CLI 명령
- `references/` - 코딩 규칙, 디자인, 도메인 문서

출력 디렉터리는 프로젝트 루트에 위치합니다.

- `codemaps/` - 자동 생성된 코드 구조 문서
- `humanmaps/` - 사람용 HTML 문서
- `plans/` - 구현 계획
- `reports/` - 보고서
- `logs/` - 로그

### 2. 프로젝트에 맞는 설정은 어디서 수정해야 하나?

프로젝트별 커스터마이즈는 플러그인 루트의 아래 경로에서 합니다.

- `references/` - 코딩 규칙, 디자인, 도메인 문서

### 3. 왜 일부 MCP 서버는 공유 `.mcp.json`에 넣지 않나?

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

이유:

- `filesystem`은 실제 프로젝트 절대 경로가 필요함
- `context7`, `sequential-thinking`은 `npx` 기반 stdio launcher임
- `playwright-test`는 로컬 브라우저/테스트 런타임에 의존함

### 7. MCP 설정은 어디에 두는 게 좋나?

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
    }
  }
}
```

## MCP 정책

이 플러그인은 공유 `.mcp.json`을 사용하지 않습니다. 모든 MCP 서버는 머신 로컬 설정으로 관리합니다.

로컬 stdio 서버가 필요하면 머신별 설정 파일(`~/.claude.json`)에서 관리하는 편이 맞습니다.
