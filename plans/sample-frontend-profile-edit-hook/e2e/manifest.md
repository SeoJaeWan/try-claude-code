# E2E Test Manifest

## Strategy

- Runner: `Playwright`
- Target surface: `/profile` edit surface

## Files

| Artifact File | Runner | Surface / Flow | Placement Intent | Constraints | Scenario Types |
| --- | --- | --- | --- | --- | --- |
| `profile-edit-hook.spec.ts` | `Playwright` | `profile-edit-hook` | `feature-surface-web` | [C-PROFILE-001], [C-PROFILE-002], [C-PROFILE-003], [C-PROFILE-004], [C-PROFILE-005] | interaction, validation, edge |

## Implementation Placement

- Resolve final destination during implementation using `features/frontend-dev-fixture/tests/*.spec.ts` layout and repo naming conventions
- Keep assertions, locators, and scenario scope unchanged when relocating plan artifacts
- If destination is still unclear after reading local conventions, stop and ask the user

## data-testid Registry

| Locator | Element | Screen/Surface |
| --- | --- | --- |
| `profile-view` | read-only profile view | `/profile` |
| `profile-form` | edit form root | `/profile` |
| `profile-edit-btn` | edit entry button | `/profile` |
| `profile-name` | name input | `/profile` |
| `profile-name-error` | name validation message | `/profile` |
| `profile-bio` | bio textarea | `/profile` |
| `profile-bio-error` | bio validation message | `/profile` |
| `profile-birthdate` | birthdate input | `/profile` |
| `profile-skills-toggle` | skills multiselect trigger | `/profile` |
| `file-upload-button` | avatar upload trigger | `/profile` |
| `profile-save` | save action button | `/profile` |
| `profile-cancel` | cancel action button | `/profile` |
| `profile-saved` | save success banner | `/profile` |
| `profile-display-name` | saved display name text | `/profile` |

## Deferred

| Journey / Flow | Reason |
| --- | --- |
| `/signup -> /profile` 인증 진입 전체 여정 | multi-route auth flow는 bounded profile surface 샘플 범위를 넘으므로 `playwright-guard` 단계로 분리한다 |

## Coverage

- Total in-scope E2E constraints: 5
- Constraints with interaction-path coverage: 5
- Constraints with validation/error coverage: 3
- Deferred out-of-scope journeys: 1
- E2E coverage: 100%
