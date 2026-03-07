# MCP 설정을 팀원들과 공유하는 방법

## 핵심 원칙: 공유 설정과 로컬 설정을 분리한다

MCP 설정은 두 가지로 나눠서 관리해야 합니다.

| 구분 | 위치 | 용도 |
|------|------|------|
| 공유 프로젝트 설정 | repo `.mcp.json` | 모든 팀원이 동일하게 쓰는 MCP 서버 |
| 머신 로컬 설정 | `~/.claude.json` | OS/경로/환경에 의존하는 MCP 서버 |

## 로컬 설정으로 관리해야 하는 MCP 서버

아래 항목은 공유 `.mcp.json`에 하드코딩하지 않고, 각 팀원이 머신 로컬 설정(`~/.claude.json`)에서 관리해야 합니다.

- **`filesystem`** -- 실제 프로젝트 절대 경로가 필요함
- **`context7`** -- `npx` 기반 stdio launcher로 OS별 커맨드가 다름
- **`sequential-thinking`** -- `npx` 기반 stdio launcher로 OS별 커맨드가 다름
- **`playwright-test`** -- 로컬 브라우저/테스트 런타임에 의존함

## 왜 로컬로 분리하나?

- launcher가 OS에 따라 다름 (Windows: `cmd /c npx`, macOS/Linux: `npx`)
- 실제 머신 로컬 경로가 필요함
- 로컬 자격 증명이나 환경변수가 필요함
- 모든 팀원이나 모든 프로젝트에 항상 필요한 것은 아님

## 팀 공유 방법 (권장)

공유 `.mcp.json`에 하드코딩하지 말고, **온보딩 문서나 FAQ에 OS별 템플릿 예시를 두는 편이 안전합니다.** 팀원은 아래 템플릿을 복사해서 자신의 `~/.claude.json`에 붙여넣으면 됩니다.

### Windows 템플릿

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

### macOS / Linux 템플릿

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

## 요약

1. cross-platform으로 안전한 MCP 서버만 repo `.mcp.json`에 넣는다.
2. OS/경로 의존 MCP 서버는 머신 로컬 `~/.claude.json`에서 관리한다.
3. 팀원 온보딩 시 위 템플릿을 공유하고, 각자 경로만 수정해서 사용하도록 안내한다.
