# PR 시뮬레이션 (without_skill)

## 현재 상태
- Branch: `0.1.0` (main branch)
- 변경 파일: `.claude/settings.local.json` (staged), `skills/accessibility-review/SKILL.md`, `skills/web-quality-audit/SKILL.md` (unstaged), `skills-workspace/` (untracked)

## 워크플로우
1. `git status` / `git diff --stat` / `git log` 실행
2. 현재 main branch(0.1.0)에 있으므로 PR 생성 불가
3. 새 브랜치 생성 필요: `git checkout -b feat/update-skill-definitions`
4. 변경사항 스테이징 및 커밋
5. 리모트 푸시: `git push -u origin feat/update-skill-definitions`
6. PR 생성: `gh pr create`

## PR 제목
`refactor: update skill definitions and local settings`

## PR 본문
```markdown
## Summary
스킬 정의 파일과 로컬 설정을 업데이트합니다.

## Changes
- accessibility-review SKILL.md 업데이트
- web-quality-audit SKILL.md 업데이트
- 로컬 Bash 권한 설정 변경

## Test plan
- [ ] 로컬 환경에서 스킬 트리거 확인
```

## 문제점
- main branch에서 직접 PR 생성 불가
- 새 브랜치를 먼저 만들어야 함
