# E2E Test Manifest

## Strategy

- Runner: `Playwright`
- Target surface: `/dashboard` notification section

## Files

| Artifact File | Runner | Surface / Flow | Placement Intent | Constraints | Scenario Types |
| --- | --- | --- | --- | --- | --- |
| `dashboard-notification-filter.spec.ts` | `Playwright` | `dashboard-notification-filter` | `feature-surface-web` | [C-NOTI-001], [C-NOTI-002], [C-NOTI-003], [C-NOTI-004] | interaction, edge, validation |

## Implementation Placement

- Resolve final destination during implementation using `features/next-app/tests/*.spec.ts` layout and repo naming conventions
- Keep assertions, locators, and scenario scope unchanged when relocating plan artifacts
- If destination is still unclear after reading local conventions, stop and ask the user

## data-testid Registry

| Locator | Element | Screen/Surface |
| --- | --- | --- |
| `notifications-filter-all` | all filter button | `/dashboard` |
| `notifications-filter-unread` | unread filter button | `/dashboard` |
| `notifications-list` | notifications list container | `/dashboard` |
| `notification-{id}` | notification row | `/dashboard` |
| `notifications-empty` | unread empty state | `/dashboard` |
| `notifications-loading` | loading skeleton | `/dashboard` |
| `notifications-error` | error message | `/dashboard` |

## Deferred

| Journey / Flow | Reason |
| --- | --- |
| `/dashboard`에서 다른 route로 이동하며 알림 상태를 유지하는 회귀 | cross-route regression은 `playwright-guard` 단계로 분리한다 |

## Coverage

- Total in-scope E2E constraints: 4
- Constraints with interaction-path coverage: 4
- Constraints with validation/error coverage: 2
- Deferred out-of-scope journeys: 1
- E2E coverage: 100%
