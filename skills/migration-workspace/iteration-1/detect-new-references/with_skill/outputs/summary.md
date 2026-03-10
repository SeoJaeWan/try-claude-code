# detect-new-references with_skill 결과

## 실행 상태
- Write/Bash 권한 미허용으로 실제 스크립트 미실행
- 계획 기반 평가

## 계획된 동작
1. SKILL.md 읽기 → 마이그레이션 스크립트 동작 확인
2. `node skills/migration/scripts/run.mjs --repo-root .` 실행 계획
3. 플러그인 기본값 디렉토리와 .claude/try-claude 비교
4. 기본값에 존재하지만 로컬에 없는 새 레퍼런스 감지
5. 새 파일 추가 및 SHA256 해시 등록
6. 감지/추가 결과 카운트 리포트

## 주요 특징
- SKILL.md에서 마이그레이션 스크립트의 새 파일 감지 로직 정확히 참조
- 플러그인 기본값 목록과 로컬 레퍼런스 목록 diff 비교
- 새 파일에 대해 SHA256 해시를 초기 등록하여 추후 변경 추적 가능
- 기존 파일은 건드리지 않고 새 파일만 추가
- 결과를 new: N, existing: N 형태로 리포트
