# E2E Test Manifest

## Strategy

- Runner: `Playwright`
- Target surface: `/todos` empty state

## Files

| Artifact File | Runner | Surface / Flow | Placement Intent | Constraints | Scenario Types |
| --- | --- | --- | --- | --- | --- |
| `todos-empty-state.spec.ts` | `Playwright` | `todos-empty-state` | `feature-surface-web` | [C-EMPTY-001], [C-EMPTY-002], [C-EMPTY-003] | interaction, edge |

## Implementation Placement

- Resolve final destination during implementation using `features/next-app/tests/*.spec.ts` layout and repo naming conventions
- Keep assertions, locators, and scenario scope unchanged when relocating plan artifacts
- If destination is still unclear after reading local conventions, stop and ask the user

## data-testid Registry

| Locator | Element | Screen/Surface |
| --- | --- | --- |
| `empty-state` | empty state container | `/todos` |
| `empty-state-title` | empty state title text | `/todos` |
| `empty-state-description` | empty state description text | `/todos` |
| `search-input` | search field | `/todos` |
| `todo-input` | todo creation input | `/todos` |
| `todo-add` | todo create submit button | `/todos` |

## Deferred

| Journey / Flow | Reason |
| --- | --- |
| `signup -> dashboard -> todos` 전체 브라우저 회귀 | cross-route full journey는 이 bounded surface 샘플 범위를 넘는다 |

## Coverage

- Total in-scope E2E constraints: 3
- Constraints with interaction-path coverage: 3
- Constraints with validation/error coverage: 0
- Deferred out-of-scope journeys: 1
- E2E coverage: 100%
