# preserve-user-edits with_skill 결과

## 실행 상태
- Write/Bash 권한 미허용으로 실제 스크립트 미실행
- 계획 기반 평가

## 계획된 동작
1. SKILL.md 읽기 → section-aware merge 동작 방식 확인
2. `node skills/migration/scripts/run.mjs --repo-root .` 실행 계획
3. coding-rules 문서의 각 섹션별 SHA256 해시 계산
4. 플러그인 기본값의 해당 섹션 해시와 비교
5. 사용자 수정 섹션 감지 → 해당 섹션 스킵
6. 미수정 섹션만 최신 기본값으로 업데이트

## 주요 특징
- SKILL.md에서 section-aware merge 메커니즘을 정확히 참조
- 섹션 단위 SHA256 해시 비교로 사용자 수정 감지
- 사용자가 커스터마이징한 섹션은 보존하고 나머지만 업데이트
- 마이그레이션 스크립트의 --repo-root 옵션으로 정확한 경로 지정
- 업데이트 결과를 섹션별로 리포트 (preserved: N, updated: N)
