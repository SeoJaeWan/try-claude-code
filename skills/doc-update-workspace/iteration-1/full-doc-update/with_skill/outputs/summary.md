# full-doc-update with_skill 결과

## 실행 상태
- Write/Bash 권한 미허용으로 실제 파일 미생성
- 계획 기반 평가

## 파이프라인 실행 계획
1. SKILL.md 읽기 → doc-update 파이프라인 순서 파악
2. `detect_changes.mjs` 실행 → 변경된 서비스 코드 감지
3. `extract_structure.mjs` 실행 → 코드 구조 추출 (함수, 클래스, 모듈 의존성)
4. CODEMAPS (.md) 생성 → `.claude/try-claude/codemaps/` 경로
5. HUMANMAPS (.html) 생성 → `.claude/try-claude/humanmaps/` 경로

## 계획된 출력 파일
```
.claude/try-claude/codemaps/
  backend-api.codemap.md
  frontend-app.codemap.md
  shared-utils.codemap.md

.claude/try-claude/humanmaps/
  backend-api.humanmap.html
  frontend-app.humanmap.html
  shared-utils.humanmap.html
```

## 주요 특징
- SKILL.md에서 파이프라인 순서를 정확히 파악하고 순차 실행 계획
- detect_changes.mjs로 git diff 기반 변경 파일 목록 추출
- extract_structure.mjs로 AST 기반 코드 구조 분석
- CODEMAPS: 함수 시그니처, 클래스 계층, 모듈 의존성 포함
- HUMANMAPS: HTML 형태로 사람이 읽기 쉬운 문서 생성
- 두 문서 모두 올바른 출력 경로 사용
