---
description: "try-claude 설정, init/migration 동작, 런타임 경로, MCP 정책을 FAQ 형식으로 안내합니다. '/help-try', 'help try', 'try-claude help', '설정 도움', 'mcp 도움' 요청에서 트리거됩니다."
model: haiku
allowed-tools: Read, Glob
---

<Command_Guide>
<Purpose>
try-claude 운영 관련 자주 묻는 질문에 답한다.
</Purpose>

<Instructions>

# help-try

다음 주제에 대해 FAQ 스타일로 안내한다.

- `init-try`
- `migration`
- `.claude/try-claude/` runtime structure
- shared vs local MCP configuration
- OS-dependent MCP setup

답변 전에 아래를 읽는다.

- `<plugin-root>/skills/help-try/README.md`
- `<plugin-root>/skills/help-try/SKILL.md`

## 응답 우선순위

1. 런타임 경로나 커맨드를 명확하게 설명한다.
2. 플러그인 기본값과 소비자 저장소 상태를 구분해서 설명한다.
3. MCP 설정 질문이면 아래를 분리해서 설명한다.
   - shared `.mcp.json`
   - machine-local config
4. OS 의존 MCP 질문이면 Windows/macOS/Linux 템플릿을 안내한다.

## 주의사항

- 답변은 간결하게 유지한다.
- 정확한 파일 경로와 바로 쓸 수 있는 다음 행동을 우선한다.
- 기본적으로 migration 실행이나 파일 수정 명령이 아니라 FAQ/help 응답으로 다룬다.
- 기본 출력 언어는 한국어로 한다.

</Instructions>
</Command_Guide>
