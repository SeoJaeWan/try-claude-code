# pr-with-reviewer with_skill 결과

## 실행 상태
- Write/Bash 권한 미허용으로 실제 PR 미생성
- 계획 기반 평가

## 실행 워크플로우
1. **SKILL.md 읽기** — PR 생성 스킬 워크플로우 확인
2. **브랜치 상태 확인** — `git status`, `git branch --show-current` 실행
3. **리모트 동기화 확인** — `git log origin/main..HEAD --oneline` 실행
4. **커밋 히스토리 분석** — 전체 커밋 및 diff 분석
5. **PR 템플릿 확인** — `.github/PULL_REQUEST_TEMPLATE.md` 파일 존재 여부 확인
6. **PR 본문 작성** — Summary, Changes, Test plan 섹션 구성
7. **PR 생성** — `gh pr create --title "..." --body "..." --reviewer kim` 실행 계획

## 주요 특징
- SKILL.md 기반 체계적 워크플로우 실행
- 사용자 요청에 따라 --reviewer kim 옵션 포함
- 커밋 메시지 분석 기반 PR 제목 및 본문 자동 생성
- PR 템플릿 확인 후 적절한 형식 적용
- HEREDOC 패턴으로 PR body 포맷팅
