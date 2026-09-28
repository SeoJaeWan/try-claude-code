# Host Setup — Codex·Claude Code

> 기준일: 2026-09-28

Workbench는 같은 `plugin/plugins/workbench/`를 Codex와 Claude Code에 각각 설치해 사용합니다. 플러그인은 MCP를 번들하지 않으므로, 필요한 MCP는 각 도구의 사용자 설정에 직접 등록합니다.

## 플러그인 설치

marketplace 이름은 두 도구 모두 `workbench`, 설치 ID는 `workbench@workbench`입니다. 등록은 한 번만 하면 됩니다. `<repo>`는 이 저장소의 로컬 checkout 경로입니다.

| 단계 | Codex | Claude Code |
|---|---|---|
| marketplace 등록 | `codex plugin marketplace add <repo>/plugin` | `claude plugin marketplace add <repo>/plugin` |
| 설치·갱신 | `npm run deploy:codex` | `npm run deploy:claude` |
| 적용 | 새 세션 | Claude Code 재시작 또는 `/reload-plugins` |

- 이전 `local-work` marketplace(`codex-plugin/` 경로)를 등록했다면 `codex plugin marketplace remove local-work`로 제거한 뒤 다시 등록합니다.
- 배포 스크립트는 marketplace가 현재 checkout의 `plugin/`을 가리키지 않으면 등록 명령을 안내하고 중단합니다.
- Claude Code에서 설치 없이 확인할 때는 `claude --plugin-dir <repo>/plugin/plugins/workbench`로 해당 세션에만 불러올 수 있습니다.

## 호출

| | Codex | Claude Code |
|---|---|---|
| 명시 호출 | `$workbench:shape` | `/workbench:shape` |
| 암묵 호출 차단 | `agents/openai.yaml`의 `allow_implicit_invocation: false` | `SKILL.md`의 `disable-model-invocation: true` |

일상 대화("요구사항 정리해줘" 등)로는 두 도구 모두 스킬이 실행되지 않습니다.

## MCP

| MCP | 용도 | 사용 스킬 |
|---|---|---|
| Figma | 요청에 연결된 Figma 근거 조회(읽기 전용) | Shape |
| Codocs | 로컬 `.codocs` 조회·수정·검증 | 네 스킬 모두 (없으면 로컬 파일 방식) |
| `gateway-public` | Local Work Memory Artifact 조회, Context7 공식 문서 조회 | Shape, Prepare, Execute Task |

`gateway-public`은 Local Work Memory(`memory_*`), Context7(`context7_*`), Atlassian(`atlassian_*`) 도구를 함께 제공합니다. Workbench는 Jira를 프로젝트 규칙 근거로 조회하지 않습니다.

### Codex (`~/.codex/config.toml`)

```toml
[mcp_servers.figma]
url = "https://mcp.figma.com/mcp"

[mcp_servers.gateway-public]
url = "https://gateway.seojaewan.com/mcp"

[mcp_servers.codocs]
command = "<node 경로>"
args = ["<npm 전역 경로>/co-documentation/dist/runtime/cli.js"]
```

Shape의 `agents/openai.yaml`은 Figma를 도구 의존성으로 선언합니다.

### Claude Code (user scope)

```bash
claude mcp add --scope user --transport http gateway-public https://gateway.seojaewan.com/mcp
claude mcp add --scope user codocs -- <node 경로> <npm 전역 경로>/co-documentation/dist/runtime/cli.js
```

Figma는 공식 `figma` 플러그인(`figma@claude-plugins-official`)의 MCP를 사용합니다. 인증이 필요한 서버는 Claude Code에서 `/mcp`로 인증합니다.

`<node 경로>`와 `<npm 전역 경로>`는 `which node`, `npm root -g`로 확인합니다. nvm으로 node 버전을 바꾸면 두 도구의 codocs 경로를 함께 갱신해야 합니다.

## 확인

설정을 바꾼 뒤 두 도구에서 각각 확인합니다.

1. **플러그인:** 스킬 목록에 `workbench`의 네 스킬이 보이는지, 일상 대화로는 실행되지 않고 명시 호출로만 실행되는지 확인합니다.
2. **gateway-public:** `memory_projects` 같은 읽기 도구 호출이 성공하는지 확인합니다.
3. **Codocs:** 연결이 가리키는 프로젝트 루트가 실제 작업 checkout(또는 task worktree)과 같은지 확인합니다. 스킬은 다른 checkout에 연결된 Codocs를 근거로 쓰지 않고 로컬 파일 방식으로 전환합니다.
4. **Figma:** Figma 링크가 있는 요청에서 Shape가 근거를 읽을 수 있는지 확인합니다.
