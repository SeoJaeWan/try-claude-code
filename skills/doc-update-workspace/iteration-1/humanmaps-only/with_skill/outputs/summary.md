# humanmaps-only with_skill 결과

## 실행 상태
- Write/Bash 권한 미허용으로 실제 파일 미생성
- 계획 기반 평가

## 파이프라인 실행 계획
1. SKILL.md 읽기 → doc-update 파이프라인 순서 파악
2. `detect_changes.mjs` 실행 → 전체 프로젝트 스캔 모드
3. `extract_structure.mjs` 실행 → 전체 프로젝트 코드 구조 추출
4. HUMANMAPS (.html) 생성 → `.claude/try-claude/humanmaps/` 경로
5. CODEMAPS 생성 건너뜀 (요청 범위 외)

## 계획된 출력 파일
```
.claude/try-claude/humanmaps/
  backend-api.humanmap.html
  frontend-app.humanmap.html
  shared-utils.humanmap.html
```

## 주요 특징
- SKILL.md에서 HUMANMAPS 전용 생성 절차 확인
- detect_changes.mjs를 전체 스캔 모드로 실행 계획
- extract_structure.mjs로 모든 서비스의 구조 추출
- HUMANMAPS만 생성, CODEMAPS는 명시적으로 제외
- HTML 형식으로 모듈별 구조, 함수 목록, 의존성 그래프 포함
- 사람이 읽기 쉬운 네비게이션 구조 포함 계획
