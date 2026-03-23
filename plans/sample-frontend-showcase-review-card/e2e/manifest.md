# E2E Test Manifest

## Strategy

- Runner: `Playwright`
- Target surface: `/showcase` review card section

## Files

| Artifact File | Runner | Surface / Flow | Placement Intent | Constraints | Scenario Types |
| --- | --- | --- | --- | --- | --- |
| `showcase-review-card.spec.ts` | `Playwright` | `showcase-review-card` | `feature-surface-web` | [C-REVIEW-001], [C-REVIEW-002], [C-REVIEW-003] | interaction, structure |

## Implementation Placement

- Resolve final destination during implementation using `features/ui-publish-fixture/tests/*.spec.ts` layout and repo naming conventions
- Keep assertions, locators, and scenario scope unchanged when relocating plan artifacts
- If destination is still unclear after reading local conventions, stop and ask the user

## data-testid Registry

| Locator | Element | Screen/Surface |
| --- | --- | --- |
| `showcase-review-section` | review card section wrapper | `/showcase` |
| `showcase-review-grid` | review card grid container | `/showcase` |
| `review-card` | review card root | `/showcase` |
| `review-card-avatar` | avatar area | `/showcase` |
| `review-card-author` | author text | `/showcase` |
| `review-card-rating` | rating shell | `/showcase` |
| `review-card-body` | review text body | `/showcase` |
| `review-card-date` | created date text | `/showcase` |

## Deferred

| Journey / Flow | Reason |
| --- | --- |
| 리뷰 작성부터 저장 완료까지의 흐름 | form submit과 persistence가 필요한 multi-step journey라서 visual-only 샘플 범위를 넘는다 |

## Coverage

- Total in-scope E2E constraints: 3
- Constraints with interaction-path coverage: 3
- Constraints with validation/error coverage: 0
- Deferred out-of-scope journeys: 1
- E2E coverage: 100%
