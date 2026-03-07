# try-claude 설정 방법 및 init-try / migration 차이

## try-claude 설정은 어떻게 하나요?

### 1단계: 플러그인 설치

플러그인을 설치하면 기본 자산(`agents/`, `skills/`, `commands/`, `references/`)이 생깁니다. 이 시점에는 아직 소비자 저장소에 런타임이 없습니다.

### 2단계: `init-try` 실행

소비자 저장소에서 `init-try`를 실행하면 `.claude/try-claude/` 런타임이 생성됩니다. 생성되는 구조:

- `.claude/try-claude/project.json`
- `.claude/try-claude/references/`
- `.claude/try-claude/plans/`
- `.claude/try-claude/reports/`
- `.claude/try-claude/logs/`
- `.claude/try-claude/codemaps/`
- `.claude/try-claude/humanmaps/`

플러그인 기본 `references/**`가 소비자 저장소 런타임으로 시드되고, `project.json`에 관리 대상 reference 메타데이터가 기록됩니다.

### 3단계: 프로젝트별 커스터마이즈

프로젝트에 맞는 설정은 소비자 저장소의 `.claude/try-claude/references/`에서 수정합니다. 플러그인 설치 위치의 기본 `references/`는 직접 수정하지 않는 편이 맞습니다.

---

## init-try와 migration의 차이

| 항목 | `init-try` | `migration` |
|------|-----------|-------------|
| 목적 | 최초 런타임 생성 | 기존 런타임을 플러그인 최신 기본값과 동기화 |
| 실행 시점 | 처음 한 번 | 플러그인 업데이트 후 |
| 하는 일 | `.claude/try-claude/` 디렉터리 생성 + reference 시드 | 수정하지 않은 section 업데이트, 수정한 section 보존 |

### `init-try` 요약

- `.claude/try-claude/`를 만들고 managed reference를 시드한다.
- 최초 설정용이다.

### `migration` 요약

- 수정하지 않은 markdown section만 업데이트한다.
- 사용자가 수정한 markdown section은 보존한다.
- 플러그인에 새로 생긴 section은 추가한다.
- 플러그인에 새로 생긴 reference 파일은 다시 시드한다.
- 로컬 전용 파일이나 section은 자동 삭제하지 않는다.

---

## MCP 설정 참고

공유 `.mcp.json`에 모든 MCP 서버를 넣지 않습니다. OS 의존적이거나 로컬 경로가 필요한 서버는 머신 로컬 설정(`~/.claude.json`)으로 관리합니다.

로컬 설정 대상:

- `filesystem` -- 실제 프로젝트 절대 경로가 필요
- `context7`, `sequential-thinking` -- `npx` 기반 stdio launcher
- `playwright-test` -- 로컬 브라우저/테스트 런타임에 의존
