# main-branch-guard with_skill 결과

## 실행 상태
- Write/Bash 권한 미허용으로 실제 명령어 미실행
- 계획 기반 평가

## 실행 워크플로우
1. **SKILL.md 읽기** — PR 생성 스킬 워크플로우 확인
2. **브랜치 상태 확인** — `git branch --show-current` 실행
3. **main 브랜치 감지** — 현재 브랜치가 main임을 확인
4. **경고 메시지 출력** — main 브랜치에서는 PR을 생성할 수 없음을 안내
5. **대안 제시** — 새 브랜치를 생성하거나 기존 feature 브랜치로 전환할 것을 제안
6. **PR 생성 중단** — gh pr create를 실행하지 않음

## 주요 특징
- SKILL.md의 브랜치 확인 단계에서 main 브랜치 감지
- main/master 브랜치 가드 로직이 스킬에 내장
- 명확한 경고 메시지와 함께 대안 제시
- gh pr create를 실행하지 않아 안전한 동작
- `git checkout -b feature/xxx` 또는 `git switch -c feature/xxx` 명령어 안내
