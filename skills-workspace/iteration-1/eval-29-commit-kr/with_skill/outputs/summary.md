# commit 스킬 평가 (Korean prompt, with_skill)

## 읽은 스킬: skills/commit/SKILL.md

## git status/diff 분석
- 변경 파일 확인: .claude/settings.local.json

## Conventional Commits 포맷 (type: subject)
- chore: add WebSearch to allowed tools in local settings
- 52자 (72자 미만)

## commitlint 검증
- commitlint.config.mjs 미존재로 스킵
- 수동 Conventional Commits 스펙 검사: PASS

## amend 루프
- commitlint 실패 시 amend 후 재시도
- subject-only (body 없음, 단순 변경)
