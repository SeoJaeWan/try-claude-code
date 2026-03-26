---
name: init-memory
description: "Obsidian + Google Drive 기반 Claude Code 메모리 symlink 초기화. 'init-memory', '메모리 초기화', '메모리 연결', '메모리 세팅', 'memory setup' 요청 시 트리거. 새 프로젝트에서 메모리 연동이 필요할 때, 기존 symlink 상태를 점검하고 싶을 때도 사용한다."
allowed-tools: Bash, Read, Write, Glob, AskUserQuestion
---

<Skill_Guide>
<Purpose>
Claude Code의 3계층 메모리(User/Project/Auto)를 Obsidian vault(Google Drive)에 symlink로 연결한다.
이미 연결된 항목은 건너뛰고, 누락된 항목만 새로 설정한다.
</Purpose>

<Instructions>

# Init Memory — Obsidian + Google Drive 메모리 연동

Claude Code 메모리를 Google Drive 내 Obsidian vault에 symlink로 연결하여,
기기 간 동기화 및 Obsidian 시각적 관리를 가능하게 한다.

## 사전 조건

- Google Drive 데스크톱이 설치되어 마운트되어 있어야 한다
- Obsidian vault가 Google Drive 안에 생성되어 있어야 한다

## 설정 값

```
VAULT_BASE: G:\내 드라이브\ClaudeMemory
```

이 경로가 사용자 환경과 다를 수 있으므로, 첫 실행 시 AskUserQuestion으로 확인한다.

## 3계층 메모리 구조

| 계층 | Claude Code 경로 | Obsidian 대상 경로 |
|------|------------------|-------------------|
| User memory (전역) | `~/.claude/CLAUDE.md` | `{VAULT_BASE}/user-memory/CLAUDE.md` |
| Project memory | `./.claude/CLAUDE.md` | `{VAULT_BASE}/projects/{프로젝트명}/CLAUDE.md` |
| Auto-memory | `~/.claude/projects/{프로젝트키}/memory/` | `{VAULT_BASE}/projects/{프로젝트명}/auto-memory/` |

- **프로젝트명**: 현재 디렉토리의 폴더 이름 (예: `try-claude-code`)
- **프로젝트키**: `~/.claude/projects/` 하위의 인코딩된 경로명 (예: `C--Users-USER-Desktop-dev-try-claude-code`)

## 실행 순서

### Step 1: 환경 탐지

```bash
# 현재 프로젝트 정보
PROJECT_DIR=$(pwd)
PROJECT_NAME=$(basename "$PROJECT_DIR")

# 프로젝트키 탐지 — ~/.claude/projects/ 에서 현재 경로에 매칭되는 폴더 찾기
# pwd의 경로를 C--Users-USER-... 형식으로 변환하여 매칭
```

- Google Drive 마운트 확인: `G:\` 또는 사용자 지정 경로가 접근 가능한지 확인
- 접근 불가 시 AskUserQuestion으로 올바른 경로를 요청

### Step 2: 상태 점검

3개 항목 각각에 대해 현재 상태를 확인한다:

```bash
# 각 경로에 대해
file <경로>
```

| 상태 | 의미 | 액션 |
|------|------|------|
| `symbolic link to ...` (정상) | 이미 연결됨 | 건너뜀 |
| `broken symbolic link` | 링크 깨짐 | 삭제 후 재생성 |
| 일반 파일/폴더 존재 | symlink 아닌 실제 파일 | 백업 후 symlink 생성 |
| 파일 없음 | 미설정 | 새로 생성 |

결과를 사용자에게 테이블로 보여주고, 진행 여부를 AskUserQuestion으로 확인한다.

### Step 3: Obsidian vault 쪽 대상 폴더/파일 생성

symlink 타겟이 되는 Google Drive 쪽 경로가 없으면 먼저 생성한다:

```bash
mkdir -p "{VAULT_BASE}/user-memory"
mkdir -p "{VAULT_BASE}/projects/{프로젝트명}/auto-memory"
touch "{VAULT_BASE}/user-memory/CLAUDE.md"        # 비어있으면 빈 파일
touch "{VAULT_BASE}/projects/{프로젝트명}/CLAUDE.md"
```

기존 파일이 있으면 덮어쓰지 않는다.

### Step 4: symlink 생성

Windows에서는 `cmd //c mklink`를 사용한다. 관리자 권한이 필요할 수 있다.

```bash
# 파일 symlink
cmd //c mklink "C:\소스경로" "G:\대상경로"

# 폴더 symlink (/D 필요)
cmd //c mklink /D "C:\소스경로" "G:\대상경로"
```

- 기존에 일반 파일이 있었다면 `{원래이름}.bak`으로 백업 후 진행
- symlink 생성 실패 시 (권한 문제) 사용자에게 관리자 cmd에서 수동 실행할 명령어를 제시

### Step 5: 검증

생성된 symlink 3개를 모두 검증한다:

```bash
# 각 symlink에 대해
file <경로>           # symbolic link 확인
echo "test" > <경로>/test.txt   # 쓰기 테스트 (auto-memory만)
cat <Google Drive 쪽>/test.txt  # 읽기 확인
rm <경로>/test.txt              # 정리
```

### Step 6: 결과 리포트

최종 상태를 테이블로 출력한다:

```
| 계층           | 상태 | Claude Code 경로        | → Obsidian 경로              |
|----------------|------|------------------------|------------------------------|
| User memory    | ✅   | ~/.claude/CLAUDE.md     | → .../user-memory/CLAUDE.md  |
| Project memory | ✅   | ./.claude/CLAUDE.md     | → .../projects/xxx/CLAUDE.md |
| Auto-memory    | ✅   | .../memory/             | → .../projects/xxx/auto-memory/ |
```

## 주의사항

- symlink 생성 전 기존 파일은 반드시 백업한다
- Google Drive 경로에 공백이 포함될 수 있으므로 항상 따옴표로 감싼다
- `mklink`은 Windows cmd 전용 명령어이므로 `cmd //c mklink`로 호출한다
- 이미 정상 연결된 항목은 절대 건드리지 않는다

---

**Integration:**
- **Previous:** N/A (user-invoked directly)
- **Next:** none
- **Final step:** Yes

</Instructions>
</Skill_Guide>
