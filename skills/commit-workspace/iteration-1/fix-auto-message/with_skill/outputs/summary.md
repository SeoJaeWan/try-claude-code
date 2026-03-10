# fix-auto-message with_skill 결과

## 실행 상태
- Write/Bash 권한 미허용으로 실제 커밋 미실행
- 계획 기반 평가

## 실행 계획
1. `skills/commit/SKILL.md` 읽기 — Conventional Commits 규칙 및 타입 테이블 확인
2. `git branch --show-current` — 현재 브랜치 확인
3. `git status` — 변경 파일 목록 확인
4. `git diff --stat` — 변경 파일 통계
5. `git diff` — 상세 변경 내용 분석 (버그 수정 내용 파악)
6. `git log -3 --oneline` — 최근 커밋 참조
7. AskUserQuestion — 현재 브랜치 유지 / 새 브랜치 생성 선택
8. diff 내용에서 버그 수정 패턴 식별 (조건문 수정, null 체크 추가, 반환값 변경 등)
9. 커밋 메시지 자동 생성: `fix: resolve null pointer in user validation` (예시)
10. `commitlint.config.mjs` 존재 확인
11. `pnpm exec commitlint --version` 실행 가능 확인
12. `git add .` + `git commit -m "fix: resolve null pointer in user validation"`
13. `pnpm exec commitlint --last --verbose` — 검증
14. 검증 실패 시 `git commit --amend` 로 메시지 수정 후 재검증
15. AskUserQuestion — 푸시 여부

## 주요 특징
- SKILL.md 타입 규칙에서 "Bug fix → fix" 매핑 확인
- diff 내용을 분석하여 수정 내용을 자동으로 파악하고 구체적 메시지 생성
- commitlint 검증 + 실패 시 amend 재시도 로직 포함
- subject line만 사용, 50자 이하
- 브랜치 확인 및 사용자 질문 단계 포함
