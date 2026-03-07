# try-claude 설정 가이드 및 init-try / migration 차이

## try-claude 설정은 어떻게 하나요?

try-claude는 Claude Code용 플러그인으로, 소비자 저장소(consumer repo)에 repo-local 런타임을 생성하여 AI 에이전트가 참조할 수 있는 규칙과 레퍼런스를 관리합니다.

### 초기 설정 순서

1. **플러그인 설치**: 플러그인에는 기본 자산(`agents/`, `skills/`, `commands/`, `references/`)이 포함되어 있습니다. 설치 직후에는 소비자 저장소에 런타임이 아직 없습니다.

2. **`init-try` 실행**: 소비자 저장소에서 아래 명령을 실행합니다.

   ```bash
   node skills/init-try/scripts/run.mjs --repo-root <repo-root>
   ```

   이 명령이 `.claude/try-claude/` 디렉터리를 생성하고 기본 레퍼런스를 시드합니다.

3. **프로젝트별 커스터마이즈**: `.claude/try-claude/references/` 경로에서 프로젝트에 맞게 수정합니다. 플러그인 원본 `references/`를 직접 수정하지 않습니다.

4. **MCP 설정**: 공유 `.mcp.json`은 사용하지 않습니다. MCP 서버는 머신 로컬 설정(`~/.claude.json`)에서 관리합니다.

### 생성되는 런타임 구조

```
.claude/try-claude/
  project.json          # 메타데이터 및 managed reference 추적
  references/            # 레퍼런스 문서 (coding-rules, design 등)
  plans/                 # 계획 문서
  reports/               # 리포트
  logs/                  # 로그
  codemaps/              # 코드맵
  humanmaps/             # 휴먼맵
```

---

## init-try와 migration의 차이

### init-try (초기 부트스트랩)

**목적**: 소비자 저장소에 `.claude/try-claude/` 런타임을 처음 만드는 것.

**하는 일**:
- 런타임 디렉터리 구조 생성 (`project.json`, `references/`, `plans/`, `reports/`, `logs/`, `codemaps/`, `humanmaps/`)
- 플러그인 기본 `references/**` 파일을 소비자 저장소 런타임으로 시드 (복사)
- 이미 존재하는 reference 파일은 덮어쓰지 않고 보존
- `project.json`에 managed reference 메타데이터 기록
- 마크다운 파일의 `##` 헤딩 단위로 섹션 추적

**실행 시점**: 플러그인 설치 직후 한 번, 또는 런타임을 새로 만들어야 할 때.

```bash
node skills/init-try/scripts/run.mjs --repo-root <repo-root>
```

### migration (동기화/업데이트)

**목적**: 플러그인이 업데이트된 후, 소비자 저장소의 managed reference를 최신 플러그인 기본값과 동기화하는 것.

**하는 일**:
- `project.json`을 읽어 현재 상태 확인
- 플러그인 기본값과 소비자 런타임의 reference를 비교
- 마크다운 파일의 섹션 단위 스마트 업데이트:
  - 수정하지 않은 섹션 -> 업데이트
  - 사용자가 수정한 섹션 -> 보존
  - 플러그인에 새로 생긴 섹션 -> 추가
  - 로컬 전용 섹션 -> 삭제하지 않음
- 새로 추가된 reference 파일 시드
- 전체 파일 비교(whole-file fallback): 이전 동기화 해시와 일치할 때만 업데이트, 사용자 수정 시 스킵
- `project.json` 메타데이터 갱신

**실행 시점**: 플러그인 버전 업데이트 후, 또는 주기적으로.

**전제 조건**: `init-try`가 먼저 실행되어 `project.json`이 존재해야 합니다.

```bash
node skills/migration/scripts/run.mjs --repo-root <repo-root>
```

---

## 핵심 차이 요약

| 항목 | init-try | migration |
|------|----------|-----------|
| 목적 | 런타임 최초 생성 | 기존 런타임 동기화 |
| 실행 시점 | 최초 1회 (또는 재생성) | 플러그인 업데이트 후 |
| 전제 조건 | 없음 | `project.json` 존재 필요 |
| 기존 파일 처리 | 보존 (덮어쓰지 않음) | 섹션 단위 스마트 머지 |
| 디렉터리 생성 | O | X (이미 존재) |
| 사용자 수정 보존 | O | O (섹션 단위) |

---

## MCP 설정 참고

공유 `.mcp.json`에 넣지 않고 머신 로컬(`~/.claude.json`)로 관리해야 하는 MCP 서버:

- **filesystem**: 실제 프로젝트 절대 경로가 필요
- **context7**, **sequential-thinking**: npx 기반 stdio launcher (OS별 차이)
- **playwright-test**: 로컬 브라우저/테스트 런타임에 의존

Windows 환경에서는 `cmd /c npx` 형태, macOS/Linux에서는 `npx` 직접 호출 형태로 설정합니다.
