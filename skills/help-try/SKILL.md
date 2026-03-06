---
name: help-try
description: try-claude 설정, init/migration, 런타임 구조, MCP 정책 관련 질문에 FAQ 형식으로 답변합니다.
---

<Skill_Guide>
<Purpose>
try-claude 플러그인 운영 방법을 FAQ 형식으로 안내한다.
</Purpose>

<Instructions>
# help-try

사용자가 아래와 같은 내용을 물을 때 이 스킬을 사용한다.

- `try-claude`가 어떻게 동작하는지
- 어느 경로를 수정해야 하는지
- `init-try`와 `migration`이 무엇을 하는지
- MCP 설정을 어떻게 나눠야 하는지

## 우선 참조

이 스킬 디렉터리의 `./README.md`를 먼저 읽고 사람용 FAQ를 기준으로 답한다.

## 반드시 유지할 핵심 답변

1. 프로젝트별 수정은 `<repo>/.claude/try-claude/references/`에서 한다.
2. `init-try`는 `.claude/try-claude/`를 만들고 managed reference를 시드한다.
3. `migration`은 수정하지 않은 markdown section만 업데이트하고, 수정한 section은 보존한다.
4. 공유 `.mcp.json`은 가능하면 cross-platform하게 유지한다.
5. OS 의존 MCP launcher는 문서화하고 로컬 설정으로 안내한다.

## MCP 정책 답변 원칙

사용자가 MCP 설정을 물으면 아래를 분리해서 설명한다.

- shared project config
- machine-local config

아래 항목이 왜 로컬 설정 대상인지 설명한다.

- `filesystem`
- `context7`
- `sequential-thinking`
- `playwright-test`
- `postgres`

추가로 아래도 필요하면 함께 설명한다.

- Windows / macOS / Linux 템플릿 위치: `README.md`
- 인증 또는 환경변수 전제
  - `GITHUB_PERSONAL_ACCESS_TOKEN`
  - `DATABASE_URL`
  - Supabase / Jira 로그인 흐름

## 응답 스타일

- 답변은 직접적으로 한다.
- 실무적으로 바로 쓸 수 있게 답한다.
- 짧은 FAQ 스타일을 선호한다.
- 런타임 경로는 정확히 적는다.
- 기본 출력 언어는 한국어로 한다.

</Instructions>
</Skill_Guide>
