# basic-pr-create with_skill 결과

## 실행 상태
- Write/Bash 권한 미허용으로 실제 PR 미생성
- 계획 기반 평가

## 실행 워크플로우
1. **SKILL.md 읽기** — PR 생성 스킬 워크플로우 확인
2. **브랜치 상태 확인** — `git status`, `git branch --show-current` 실행
3. **커밋 히스토리 분석** — `git log origin/main..HEAD`, `git diff origin/main...HEAD` 실행
4. **PR 템플릿 확인** — `.github/PULL_REQUEST_TEMPLATE.md` 파일 존재 여부 확인
5. **PR 본문 작성** — Summary, Changes, Test plan 섹션으로 구성
6. **PR 생성** — `gh pr create --title "..." --body "..."` 실행 계획

## 주요 특징
- SKILL.md 기반 체계적 워크플로우 실행
- 커밋 메시지를 분석하여 PR 제목 자동 생성
- git diff 기반 변경사항 요약으로 Changes 섹션 작성
- PR 템플릿이 있으면 해당 형식을 따르고, 없으면 기본 Summary/Changes/Test plan 형식 사용
- HEREDOC 패턴으로 PR body 포맷팅
