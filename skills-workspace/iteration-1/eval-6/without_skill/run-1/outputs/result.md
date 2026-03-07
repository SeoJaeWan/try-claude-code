# MCP 설정을 팀원들과 공유하는 방법

## MCP(Model Context Protocol) 설정 파일 개요

Claude Code에서 MCP 설정은 여러 수준의 설정 파일로 관리됩니다. 팀원들과 공유하려면 **프로젝트 수준**의 설정 파일을 사용해야 합니다.

## 설정 파일 위치와 범위

| 파일 | 범위 | Git 공유 가능 여부 |
|------|------|-------------------|
| `~/.claude/settings.json` | 사용자 전역 설정 | 불가 (개인 머신에만 존재) |
| `.claude/settings.local.json` | 프로젝트 로컬 설정 | 가능하지만 비권장 (개인 설정 포함 가능) |
| `.mcp.json` (프로젝트 루트) | 프로젝트 MCP 설정 | **권장 - 팀 공유용** |

## 팀 공유를 위한 권장 방법

### 1. 프로젝트 루트에 `.mcp.json` 파일 생성

프로젝트 루트 디렉토리에 `.mcp.json` 파일을 만들어 Git 저장소에 커밋합니다. 이 파일은 Claude Code가 프로젝트를 열 때 자동으로 인식합니다.

```json
{
  "mcpServers": {
    "서버이름": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/dir"],
      "env": {}
    },
    "another-server": {
      "command": "node",
      "args": ["path/to/server.js"],
      "env": {
        "API_KEY": "${MCP_API_KEY}"
      }
    }
  }
}
```

### 2. 환경 변수로 민감 정보 분리

MCP 서버에 API 키나 토큰이 필요한 경우, 설정 파일에 직접 넣지 말고 환경 변수를 참조하도록 합니다.

- 설정 파일에서는 `${ENV_VAR_NAME}` 형식으로 환경 변수를 참조
- 각 팀원이 자신의 `.env` 파일이나 시스템 환경 변수에 실제 값을 설정
- `.env` 파일은 `.gitignore`에 추가하여 Git에 커밋되지 않도록 처리

### 3. Git 저장소에 커밋

```bash
# .mcp.json을 Git에 추가
git add .mcp.json
git commit -m "chore: add shared MCP server configuration"
git push
```

### 4. 팀원들에게 안내할 사항

팀원들이 프로젝트를 클론한 후 다음을 수행해야 합니다:

1. **필요한 MCP 서버 패키지 설치**: `npm install` 또는 해당 패키지 매니저로 의존성 설치
2. **환경 변수 설정**: 필요한 API 키나 토큰을 자신의 환경에 설정
3. **Claude Code 재시작**: MCP 설정이 반영되도록 Claude Code를 재시작

## 주의사항

- **개인 설정과 팀 설정 분리**: 개인적으로만 사용하는 MCP 서버는 `~/.claude/settings.json`(전역) 또는 `.claude/settings.local.json`(프로젝트 로컬)에 설정하고, `.claude/settings.local.json`은 `.gitignore`에 추가하는 것을 고려하세요.
- **경로 문제**: MCP 서버 경로에 절대 경로를 사용하면 OS나 사용자 환경에 따라 달라질 수 있으므로, 가능하면 `npx`나 프로젝트 상대 경로를 사용하세요.
- **보안**: API 키, 토큰 등 민감한 정보는 절대 `.mcp.json`에 직접 하드코딩하지 마세요. 환경 변수를 통해 주입하세요.
- **MCP 서버 승인**: 팀원이 처음 프로젝트를 열면 Claude Code가 MCP 서버 사용을 승인할지 물어볼 수 있습니다. 이는 보안을 위한 정상적인 동작입니다.

## 실무 팁

1. **README에 MCP 설정 안내 추가**: 프로젝트 README에 필요한 MCP 서버와 환경 변수 목록을 문서화하세요.
2. **`.env.example` 파일 제공**: 필요한 환경 변수의 템플릿을 제공하면 팀원들이 쉽게 설정할 수 있습니다.
3. **`claude mcp add` 명령어 활용**: CLI에서 `claude mcp add <name> -- <command> <args>` 형식으로 MCP 서버를 추가할 수도 있습니다. `--scope project` 옵션을 사용하면 프로젝트 수준으로 저장됩니다.

```bash
# 프로젝트 범위로 MCP 서버 추가 예시
claude mcp add my-server --scope project -- npx -y @some/mcp-server
```
