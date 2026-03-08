# frontend-dev 스킬 평가 (Korean prompt, with_skill)

## 읽은 스킬: skills/frontend-dev/SKILL.md

## 네이밍 규칙
- use{Verb}{Resource} 패턴: useAuth 또는 useGetAuth
- coding-rules/code-style.md 참조

## TDD RED->GREEN 워크플로우
1. 테스트 먼저 복사 (RED 단계)
2. 테스트 실패 확인
3. 구현
4. 테스트 통과 확인 (GREEN)
5. typecheck/lint/build 게이트

## generate.mjs 사용
- `node generate.mjs api-hook useAuth --method mutation` 실행
- coding-rules 기반 구현

## 참조 문서
- .claude/try-claude/references/coding-rules/
- .claude/try-claude/references/design/
