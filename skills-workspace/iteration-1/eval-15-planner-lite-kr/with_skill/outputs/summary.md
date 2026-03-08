# planner-lite 스킬 평가 (Korean prompt, with_skill)

## 읽은 스킬: skills/planner-lite/SKILL.md

## Branch: 헤더 검증
- plan.md에 **Branch:** 헤더 필수. 없으면 즉시 중단

## owner_agent agents/*.md 존재 확인
- 각 phase의 owner_agent가 agents/{name}.md에 존재하는지 검증
- 8개 에이전트 사용 가능

## git worktree 라이프사이클
- `git worktree add -b $TASK_BRANCH .claude/worktrees/$TASK_BRANCH $BASE`
- phase별 순차 커밋
- `git worktree remove --force` -> merge -> branch delete

## Agent 호출 시 isolation: worktree 금지
- 중첩 worktree 방지 (.claude/worktrees/A/.claude/worktrees/B/)
- 에이전트는 cd로 worktree 디렉토리 진입

## git merge --no-ff
- 항상 merge commit 생성하여 브랜치 토폴로지 보존

## worktree 정리
- 성공: remove -> merge --no-ff -> branch -d
- 충돌: task branch 보존, merge --abort 제공
