# dev-wiki lookup

프로젝트별 dev-wiki를 참고해 구현 전 구조를 빠르게 잡고 기록된 규칙을 따른다.
dev-wiki는 Codex가 소유하는 크로스 프로젝트 지식 베이스이며, 각 워크스페이스에
해당 프로젝트 섹션이 클론되어 있을 때만 의미가 있다. **없으면 조용히 건너뛰고
평소대로 코드를 스캔한다 — 절대 하드 실패하지 않는다.**

## 리졸버 (이 순서대로)

1. `.codex/dev-wiki/config.json`이 있는지 확인한다.
   - 없으면 → **스킵.** 이 프로젝트는 dev-wiki에 opt-in하지 않았다.
2. `config.json`의 `project` 필드를 읽어 `.codex/dev-wiki/source/<project>/`를 해소한다.
   - 그 디렉터리가 없으면 → **스킵.** 아직 이 프로젝트 섹션이 동기화되지 않았다.
3. `<project>/graph/overview.md`를 **먼저** 읽는다. 저장소의 큰 영역, 먼저 볼 파일,
   읽는 순서가 여기 정리돼 있다.
4. 그다음부터는 **필요한 것만 on-demand로** 읽는다. 8개 문서를 전부 읽지 않는다.

| 목적 | 읽을 곳 |
| --- | --- |
| 구현 전 함수·계약 찾기 | `graph/symbol-map.md` |
| 흐름 추적 (planning, runner, dev-review 등) | `graph/call-map.md` |
| 도메인·계층·의존 방향 | `graph/architecture-map.md` |
| Git / HTTP 서버 / env / 파일 산출물 경계 | `graph/external-boundaries.md` |
| 코딩·이름·테스트·폴더 규칙 | `conventions/` |
| 아키텍처 규칙 (계층, 상태, 모듈 경계) | `architecture/` |
| 명령·로컬 개발·테스트 절차 | `workflows/` |

## 사용 원칙

- **네비게이션 힌트로만 사용한다.** graph 문서는 특정 source commit 시점의
  스냅샷이다 (`overview.md` 상단에 commit 해시가 박혀 있다). 후보 파일을 좁히는
  데 쓰고, **구현 결정을 내리기 전에는 반드시 원본 source를 다시 읽는다.**
- **`conventions/`에 기록된 규칙은 따른다.** wiki에 적힌 규칙이 우선이고, wiki가
  다루지 않는 부분만 기존 코드에서 관례를 발견한다.
- Do NOT wiki 내용을 source of truth로 신뢰하고 원본 확인을 건너뛴다.
- Do NOT 관련 없는 지도까지 전부 읽어 컨텍스트를 낭비한다.
- Do NOT `.codex/` 이하를 수정한다 — 읽기 전용이다.
