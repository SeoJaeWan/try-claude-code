**Branch:** {type}/{summary}

> Worktree dir: `worktrees/{type}-{summary}` (`Branch`의 `/`를 `-`로 치환)

# {작업명} 실행 계획

> 여러 executable plan이 필요한 경우 이 템플릿을 plan별로 반복 사용하고,
> 폴더는 `01-{plan-name}`, `02-{plan-name}` 순서로 나눈다.

## 단계별 실행

### Phase 1

- owner_agent: `{agent-name}`
- 목적:
- 선행조건: `none` (선택)
- 제약:
  - `[C-...]` (해당 시)
  - UI scope인 경우 `route/user state/action/visible outcome/locator` 계약
- 작업:
- 검증:
  - [ ] `{command 또는 확인 방법}`
  - [ ] `{기대 결과}`

### Phase 2

- owner_agent: `{agent-name}`
- 목적:
- 선행조건: (선택)
- 제약:
- 작업:
- 검증:
  - [ ] `{command 또는 확인 방법}`
  - [ ] `{기대 결과}`

### Phase 3

- owner_agent: `{agent-name}`
- 목적:
- 선행조건: (선택)
- 제약:
- 작업:
- 검증:
  - [ ] `{command 또는 확인 방법}`
  - [ ] `{기대 결과}`

## 테스트 계획

- 단위 테스트:
  - `plans/{task-name}/tests/manifest.md` 및 flat artifacts (해당 시)
  - 최종 소스 트리 배치는 `tests/manifest.md`와 구현 단계 규칙에서 resolve
- E2E 테스트:
  - `plans/{task-name}/e2e/manifest.md` 및 runner-appropriate artifacts (해당 시)
  - 최종 소스 트리 배치는 `e2e/manifest.md`와 구현 단계 규칙에서 resolve
